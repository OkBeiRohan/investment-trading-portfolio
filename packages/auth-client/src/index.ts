export * from "./auth-client.config";
export * from "./auth-client.types";
export { createAuthClient } from "better-auth/client";
export {
  organizationClient,
  twoFactorClient,
  genericOAuthClient,
} from "better-auth/client/plugins";
export { passkeyClient } from "@better-auth/passkey/client";

/**
 * Singleton auth client instance
 * Configured with default baseURL that can be overridden in Next.js middleware
 */
import { createAuthClientInstance } from "./auth-client.config";

export const authClient = createAuthClientInstance({
  basePath: "/api/auth",
});
