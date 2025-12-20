import { Injectable, Logger } from "@nestjs/common";
import { BrokerAccountRepository } from "@repo/database";
import { AuthManagerService } from "./auth-manager.service";

/**
 * Token Refresh Service
 * Manages Upstox access token refresh requests
 */
@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private readonly brokerAccountRepository: BrokerAccountRepository,
    private readonly authManager: AuthManagerService
  ) {}

  /**
   * Check for expiring tokens and request refresh
   * User will need to approve each request via app/WhatsApp
   */
  async checkAndRefreshExpiringTokens(): Promise<void> {
    this.logger.log("Checking for expiring Upstox tokens...");

    try {
      const expiringAccounts =
        await this.brokerAccountRepository.findExpiringTokens();

      if (expiringAccounts.length === 0) {
        this.logger.log("No expiring tokens found");
        return;
      }

      this.logger.log(
        `Found ${expiringAccounts.length} broker accounts with expiring tokens`
      );

      for (const account of expiringAccounts) {
        try {
          await this.requestNewToken(account.userId, account.profile.userId);
        } catch (error) {
          this.logger.error(
            `Failed to request new token for user ${account.userId}: ${error.message}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to check expiring tokens: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Request a new access token from Upstox
   * User will need to approve via app/WhatsApp
   *
   * @param userId - Better-auth user ID
   * @param upstoxUserId - Upstox user ID (UCC)
   */
  async requestNewToken(
    userId: string,
    upstoxUserId: string
  ): Promise<{ requested: boolean; expiresAt?: Date }> {
    this.logger.log(
      `Requesting new access token for user ${userId} (Upstox ID: ${upstoxUserId})`
    );

    const apiKey = process.env.UPSTOX_API_KEY;
    const apiSecret = process.env.UPSTOX_API_SECRET;
    const environment =
      (process.env.UPSTOX_ENVIRONMENT as "sandbox" | "live") || "sandbox";

    if (!apiKey || !apiSecret) {
      throw new Error(
        "UPSTOX_API_KEY and UPSTOX_API_SECRET must be configured"
      );
    }

    try {
      // Call Upstox v3 Access Token Request API
      const baseUrl =
        environment === "sandbox"
          ? "https://api-hft.upstox.com"
          : "https://api.upstox.com";

      const response = await fetch(
        `${baseUrl}/v3/login/auth/token/request/${apiKey}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_secret: apiSecret,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Token request failed: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();

      this.logger.log(
        `Token request successful. User must approve by ${new Date(Number(data.data.authorization_expiry)).toISOString()}`
      );
      this.logger.log(`Notifier URL: ${data.data.notifier_url}`);

      return {
        requested: true,
        expiresAt: new Date(Number(data.data.authorization_expiry)),
      };
    } catch (error) {
      this.logger.error(`Token request failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Manually trigger token refresh for a specific user
   * Useful for debugging or immediate refresh needs
   */
  async refreshTokenForUser(
    userId: string
  ): Promise<{ requested: boolean; message: string }> {
    const account = await this.brokerAccountRepository.findByUserIdAndProvider(
      userId,
      "upstox"
    );

    if (!account) {
      throw new Error(`No Upstox account found for user ${userId}`);
    }

    const result = await this.requestNewToken(userId, account.profile.userId);

    return {
      requested: result.requested,
      message: `Token refresh requested. User must approve by ${result.expiresAt?.toISOString()}`,
    };
  }
}
