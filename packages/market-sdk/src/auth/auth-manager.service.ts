import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AccountRepository } from "@repo/database";

@Injectable()
export class AuthManagerService {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Get access token for Upstox from better-auth Account collection
   * Upstox accounts are stored with providerId="upstox"
   */
  async getAccessToken(userId: string): Promise<string> {
    const account = await this.accountRepository.findOne({
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
    const account = await this.accountRepository.findOne({
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
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    return !!account;
  }

  /**
   * Revoke Upstox account link
   */
  async revokeUpstoxAccount(userId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      userId,
      providerId: "upstox",
    });

    if (account) {
      await this.accountRepository.delete(account._id.toString());
    }
  }
}
