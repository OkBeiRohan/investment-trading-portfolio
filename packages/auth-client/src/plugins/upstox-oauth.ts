/**
 * Upstox OAuth Client Plugin
 *
 * Provides client-side methods for linking Upstox broker accounts
 * via better-auth's generic OAuth flow.
 */

import { createAuthClient } from "better-auth/client";
import { genericOAuthClient } from "better-auth/client/plugins";

export interface UpstoxOAuthClient {
  /**
   * Initiate Upstox account linking
   * Redirects user to Upstox authorization page
   */
  linkUpstox: (options?: {
    callbackURL?: string;
    errorCallbackURL?: string;
  }) => Promise<void>;

  /**
   * Unlink Upstox account
   */
  unlinkUpstox: () => Promise<void>;
}

export function createUpstoxOAuthClient(baseURL: string): UpstoxOAuthClient {
  const authClient = createAuthClient({
    baseURL,
    plugins: [genericOAuthClient()],
  });

  return {
    async linkUpstox(options = {}) {
      const { error } = await authClient.oauth2.link({
        providerId: "upstox",
        callbackURL: options.callbackURL || "/account/linked-accounts",
        errorCallbackURL:
          options.errorCallbackURL || "/account/linked-accounts?error=true",
      });

      if (error) {
        throw new Error(`Failed to link Upstox account: ${error.message}`);
      }
    },

    async unlinkUpstox() {
      // Call API to unlink account
      const response = await fetch(`${baseURL}/api/auth/unlink-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: "upstox",
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to unlink Upstox account");
      }
    },
  };
}
