import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Account } from "@repo/database";
import { EncryptionUtil } from "./encryption.util";
import { UpstoxEnv } from "@repo/schema";

@Injectable()
export class AuthManagerService {
  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<Account>,
    private encryption: EncryptionUtil
  ) {}

  /**
   * Get access token for Upstox from better-auth Account collection
   * Upstox accounts are stored with providerId="upstox"
   */
  async getAccessToken(userId: string): Promise<string> {
    const account = await this.accountModel.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}. Please connect your Upstox account.`
      );
    }

    if (!account.accessToken) {
      throw new UnauthorizedException(
        "Upstox access token not found. Please re-authenticate."
      );
    }

    // Check token expiry
    if (
      account.accessTokenExpiresAt &&
      new Date() > account.accessTokenExpiresAt
    ) {
      throw new UnauthorizedException(
        "Upstox session expired. Please re-authenticate."
      );
    }

    return account.accessToken;
  }

  /**
   * Get the Upstox account ID (user_id from Upstox)
   */
  async getUpstoxUserId(userId: string): Promise<string> {
    const account = await this.accountModel.findOne({
      userId,
      providerId: "upstox",
    });

    if (!account) {
      throw new UnauthorizedException(
        `No Upstox account linked for user ${userId}.`
      );
    }

    return account.accountId;
  }

  /**
   * Check if user has linked Upstox account
   */
  async hasUpstoxAccount(userId: string): Promise<boolean> {
    const account = await this.accountModel.findOne({
      userId,
      providerId: "upstox",
    });

    return !!account;
  }

  /**
   * Revoke Upstox account link
   */
  async revokeUpstoxAccount(userId: string): Promise<void> {
    await this.accountModel.deleteOne({
      userId,
      providerId: "upstox",
    });
  }
  //       encryptedAccessToken: encrypted,
  //       iv,
  //       authTag: tag,
  //       environment: UpstoxEnv.LIVE,
  //       expiry: new Date(Date.now() + expires_in * 1000),
  //     },
  //     { upsert: true, new: true }
  //   );
  // }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthorizationUrl(apiKey: string, redirectUri: string): string {
    return `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  }
}
