import { createAuthClient } from "better-auth/react";
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
import { BetterAuthClientOptions } from "better-auth";

export const createAuthClientInstance = (config: BetterAuthClientOptions) => {
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
