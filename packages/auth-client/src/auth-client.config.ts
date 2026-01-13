import { createAuthClient } from "better-auth/react";
import {
  anonymousClient,
  deviceAuthorizationClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  magicLinkClient,
  oneTapClient,
  oneTimeTokenClient,
  organizationClient,
  phoneNumberClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { BetterAuthClientOptions } from "better-auth";

export const createAuthClientInstance = (config: BetterAuthClientOptions) => {
  return createAuthClient({
    baseURL: config.baseURL,
    fetchOptions: {
      credentials: "include", // Required for cross-origin cookies
      mode: "cors", // Explicit CORS mode
      ...config.fetchOptions,
    },
    plugins: [
      genericOAuthClient(),
      anonymousClient(),
      phoneNumberClient(),
      twoFactorClient({
        onTwoFactorRedirect() {
          window.location.href = "/authentication/2fa";
        },
      }),
      passkeyClient(),
      magicLinkClient(),
      deviceAuthorizationClient(),
      emailOTPClient(),
      oneTimeTokenClient(),
      oneTapClient({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        autoSelect: true,
      }),
      organizationClient(),
      inferAdditionalFields({
        user: {
          dateOfBirth: {
            type: "date",
            required: false,
          },
          isActive: {
            type: "boolean",
            defaultValue: true,
            required: true,
            input: false,
          },
          isBlocked: {
            type: "boolean",
            defaultValue: false,
            required: true,
            input: false,
          },
          role: {
            type: ["Investor", "Trader", "Admin"],
            required: true,
            input: false,
          },
          lastLoginAt: {
            type: "date",
            required: true,
            input: false,
          },
          passwordChangedAt: {
            type: "date",
            required: false,
            input: false,
          },
        },
      }),
    ],
  });
};
