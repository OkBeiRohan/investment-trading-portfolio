/**
 * Singleton auth client instance
 * Configured with default baseURL that can be overridden in Next.js middleware
 */
import { createAuthClientInstance } from "./auth-client.config";

export * from "./auth-client.types";

export const authClient = createAuthClientInstance({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "/api/auth",
});
