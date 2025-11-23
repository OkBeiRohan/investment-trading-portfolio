import { createAuthClient } from "better-auth/client";
import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export interface BetterAuthClientConfig {
  baseURL: string;
  fetchOptions?: RequestInit;
}

export const createAuthClientInstance = (config: BetterAuthClientConfig) => {
  return createAuthClient({
    baseURL: config.baseURL,
    fetchOptions: {
      credentials: "include",
      ...config.fetchOptions,
    },
    plugins: [organizationClient(), twoFactorClient(), passkeyClient()],
  });
};
