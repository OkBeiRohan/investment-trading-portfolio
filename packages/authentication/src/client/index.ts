export * from "./auth-client.config";
export * from "./auth-client.types";
export { createAuthClient } from "better-auth/client";
export {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
export { passkeyClient } from "@better-auth/passkey/client";
export { toNextJsHandler } from "better-auth/next-js";

/**
 * Singleton auth client instance
 * Configured with default baseURL that can be overridden in Next.js middleware
 */
import { createAuthClientInstance } from "./auth-client.config";

export const authClient = createAuthClientInstance({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
});
