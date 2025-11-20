import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import axios from "axios";
import { UpstoxToken, UpstoxTokenDocument } from "@repo/database"; // Assumed export
import { EncryptionUtil } from "./encryption.utils";
import { UpstoxEnv } from "@repo/schema";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly API_VERSION = "v2";

  constructor(
    @InjectModel(UpstoxToken.name)
    private tokenModel: Model<UpstoxTokenDocument>,
    private configService: ConfigService,
    private encryption: EncryptionUtil
  ) {}

  /**
   * Retrieves a usable access token for the given user and environment.
   * Throws if token is missing or expired.
   */
  async getAccessToken(userId: string, env: UpstoxEnv): Promise<string> {
    const tokenRecord = await this.tokenModel.findOne({
      userId,
      environment: env,
    });

    if (!tokenRecord) {
      throw new UnauthorizedException(
        `No ${env} token found for user. Please link Upstox account.`
      );
    }

    // Sandbox tokens usually don't have strict expiry in the DB context
    // (user manually updates them), but Live tokens do.
    if (env === UpstoxEnv.LIVE && new Date() > tokenRecord.expiry) {
      // Implement Refresh Token flow here if Upstox supported it properly,
      // otherwise, we must ask user to re-login.
      throw new UnauthorizedException(
        "Upstox session expired. Please login again."
      );
    }

    try {
      return this.encryption.decrypt(
        tokenRecord.encryptedAccessToken,
        tokenRecord.iv,
        tokenRecord.authTag
      );
    } catch (error) {
      this.logger.error(`Decryption failed for user ${userId}`, error);
      throw new UnauthorizedException(
        "Failed to decrypt access token. Please re-authenticate."
      );
    }
  }

  /**
   * SCENARIO 1: SANDBOX
   * User manually pastes their Sandbox Access Token from Upstox Developer Dashboard.
   * We encrypt and save it. No API Key/Secret validation required for storage.
   */
  async saveSandboxToken(userId: string, rawToken: string): Promise<void> {
    if (!rawToken || rawToken.length < 10) {
      throw new BadRequestException("Invalid Sandbox Token");
    }

    const { encrypted, iv, tag } = this.encryption.encrypt(rawToken);

    await this.tokenModel.findOneAndUpdate(
      { userId, environment: UpstoxEnv.SANDBOX },
      {
        userId,
        upstoxUserId: "SANDBOX_USER", // Placeholder
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        environment: UpstoxEnv.SANDBOX,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Assume 30 days validity
        metadata: { source: "manual_entry" },
      },
      { upsert: true, new: true }
    );

    this.logger.log(`Sandbox token updated for user ${userId}`);
  }

  /**
   * SCENARIO 2: LIVE
   * Handles the OAuth2 Callback.
   * 1. Exchanges Auth Code for Access Token.
   * 2. Encrypts and persists to MongoDB.
   */
  async handleLiveCallback(userId: string, authCode: string): Promise<any> {
    const apiKey = this.configService.get<string>("UPSTOX_API_KEY");
    const apiSecret = this.configService.get<string>("UPSTOX_API_SECRET");
    const redirectUri = this.configService.get<string>("UPSTOX_REDIRECT_URI");

    if (!apiKey || !apiSecret) {
      throw new Error(
        "Server configuration error: Missing Upstox API Credentials"
      );
    }

    try {
      // Exchange Code for Token [10]
      const params = new URLSearchParams({
        code: authCode,
        client_id: apiKey,
        client_secret: apiSecret,
        redirect_uri: redirectUri || "<default_redirect_uri>",
        grant_type: "authorization_code",
      });

      const response = await axios.post(
        `https://api.upstox.com/${this.API_VERSION}/login/authorization/token`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
        }
      );

      const { access_token, user_id, expires_in, user_name } = response.data;

      const { encrypted, iv, tag } = this.encryption.encrypt(access_token);

      // Calculate expiry (usually seconds)
      const expiryDate = new Date(Date.now() + expires_in * 1000);

      await this.tokenModel.findOneAndUpdate(
        { userId, environment: UpstoxEnv.LIVE },
        {
          userId,
          upstoxUserId: user_id,
          encryptedAccessToken: encrypted,
          iv,
          authTag: tag,
          expiry: expiryDate,
          environment: UpstoxEnv.LIVE,
          metadata: {
            userName: user_name,
            scope: "default", // Add actual scopes if available
          },
        },
        { upsert: true, new: true }
      );

      this.logger.log(
        `Live session active for Upstox User: ${user_id} (Platform User: ${userId})`
      );
      return { success: true, upstoxUserId: user_id };
    } catch (error: any) {
      this.logger.error(
        "Failed to exchange Upstox Auth Code",
        error.response?.data || error.message
      );
      throw new BadRequestException("Invalid Auth Code or Configuration");
    }
  }
}
