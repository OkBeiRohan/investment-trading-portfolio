import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpstoxToken, UpstoxTokenDocument } from '@repo/database';
import { EncryptionUtil } from '../encryption.utils';
import { AuthStrategy } from './auth.strategy';
import axios from 'axios';

@Injectable()
export class LiveAuthStrategy implements AuthStrategy {
  constructor(
    @InjectModel(UpstoxToken.name)
    private tokenModel: Model<UpstoxTokenDocument>,
    private encryptionUtil: EncryptionUtil,
  ) {}

  async getAccessToken(userId: string): Promise<string> {
    const record = await this.tokenModel.findOne({
      userId,
      environment: 'LIVE',
    });

    if (!record) {
      throw new UnauthorizedException(`No active session for user ${userId}`);
    }

    // Check Expiry
    if (new Date() > record.expiry) {
      // If refresh logic existed, it would go here.
      // Currently, Upstox flow implies re-login for standard tokens daily.
      throw new UnauthorizedException('Token expired. Please re-authenticate.');
    }

    return this.encryptionUtil.decrypt(
      record.encryptedAccessToken,
      record.iv,
      record.authTag,
    );
  }

  async handleCallback(code: string, config: any): Promise<void> {
    // Exchange Code for Token
    const params = new URLSearchParams({
      code,
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await axios.post(
      'https://api.upstox.com/v2/login/authorization/token',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    const { access_token, user_id, expires_in } = response.data;

    // Encrypt
    const { encrypted, iv, tag } = this.encryptionUtil.encrypt(access_token);

    // Upsert to DB
    await this.tokenModel.findOneAndUpdate(
      { userId: user_id },
      {
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        expiry: new Date(Date.now() + expires_in * 1000), // usually seconds
        environment: 'LIVE',
      },
      { upsert: true },
    );
  }
}
