import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UpstoxToken, UpstoxTokenDocument } from "@repo/database";
import { EncryptionUtil } from "./encryption.util";
import { UpstoxEnv } from "@repo/schema";
import axios from "axios";

@Injectable()
export class AuthManagerService {
  constructor(
    @InjectModel(UpstoxToken.name)
    private tokenModel: Model<UpstoxTokenDocument>,
    private encryption: EncryptionUtil
  ) {}

  /**
   * Get decrypted access token for a user
   */
  async getAccessToken(userId: string, env: UpstoxEnv): Promise<string> {
    const tokenRecord = await this.tokenModel.findOne({
      userId,
      environment: env,
    });

    if (!tokenRecord) {
      throw new UnauthorizedException(
        `No ${env} token found for user ${userId}. Please link Upstox account.`
      );
    }

    // Check expiry (only for LIVE)
    if (env === UpstoxEnv.LIVE && new Date() > tokenRecord.expiry) {
      throw new UnauthorizedException(
        "Upstox session expired. Please re-authenticate."
      );
    }

    // Decrypt token
    return this.encryption.decrypt(
      tokenRecord.encryptedAccessToken,
      tokenRecord.iv,
      tokenRecord.authTag
    );
  }

  /**
   * SANDBOX: User manually pastes token from Upstox Dashboard
   */
  async saveSandboxToken(userId: string, rawToken: string): Promise<void> {
    const { encrypted, iv, tag } = this.encryption.encrypt(rawToken);

    await this.tokenModel.findOneAndUpdate(
      { userId, environment: UpstoxEnv.SANDBOX },
      {
        userId,
        upstoxUserId: "SANDBOX_USER",
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        environment: UpstoxEnv.SANDBOX,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      { upsert: true, new: true }
    );
  }

  /**
   * LIVE: Handle OAuth2 callback after user authorizes
   */
  async handleLiveCallback(
    userId: string,
    authCode: string,
    config: { apiKey: string; apiSecret: string; redirectUri: string }
  ): Promise<void> {
    // Exchange code for token
    const params = new URLSearchParams({
      code: authCode,
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });

    const response = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, user_id, expires_in } = response.data;

    // Encrypt and store
    const { encrypted, iv, tag } = this.encryption.encrypt(access_token);

    await this.tokenModel.findOneAndUpdate(
      { userId, environment: UpstoxEnv.LIVE },
      {
        userId,
        upstoxUserId: user_id,
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        environment: UpstoxEnv.LIVE,
        expiry: new Date(Date.now() + expires_in * 1000),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthorizationUrl(apiKey: string, redirectUri: string): string {
    return `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  }
}
