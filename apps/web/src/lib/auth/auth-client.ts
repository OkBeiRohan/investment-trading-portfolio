/**
 * Shared Auth Client
 *
 * Re-export the singleton auth client from @repo/auth-client.
 * This ensures the same client instance is used across:
 * - Web app components (useAuth, AuthProvider)
 * - tRPC client (auth-link for automatic retry on 401)
 * - Server-side DAL (verifySession)
 *
 * The client is configured in @repo/auth-client with:
 * - baseURL: NEXT_PUBLIC_APP_URL or http://localhost:3000
 * - basePath: /api/auth
 * - All better-auth plugins enabled
 */
export { authClient } from "@repo/auth-client";
export type { AuthClient } from "@repo/auth-client";
