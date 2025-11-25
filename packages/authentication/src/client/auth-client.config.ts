import { createAuthClient } from "better-auth/client";
import {
  deviceAuthorizationClient,
  emailOTPClient,
  magicLinkClient,
  multiSessionClient,
  oneTimeTokenClient,
  organizationClient,
  phoneNumberClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export interface BetterAuthClientConfig {
  baseURL?: string;
  fetchOptions?: RequestInit;
}

export const createAuthClientInstance = (config: BetterAuthClientConfig) => {
  return createAuthClient({
    baseURL: config.baseURL,
    fetchOptions: {
      credentials: "include",
      ...config.fetchOptions,
    },
    plugins: [
      phoneNumberClient(),
      twoFactorClient(),
      passkeyClient(),
      magicLinkClient(),
      deviceAuthorizationClient(),
      emailOTPClient(),
      oneTimeTokenClient(),
      multiSessionClient(),
      organizationClient(),
    ],
  });
};
