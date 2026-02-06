import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../server";
import { getQueryClient, createServerQueryClient } from "./query-client";
import { authLink } from "./auth-link";
import { authClient } from "@repo/auth-client";

/**
 * tRPC React client with classic API.
 * Provides simpler hooks: trpc.router.procedure.useQuery()
 */
export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    // Auth link: handles 401 errors by refreshing session and retrying
    authLink(authClient),
    // HTTP link: handles actual network requests with credentials
    httpBatchLink({
      url: "/api/trpc",
      // Always include credentials (cookies) in requests
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      // transformer: superjson, // Uncomment if using superjson for Date/Map/Set serialization
    }),
  ],
});

// Re-export query client utilities for SSR
export { getQueryClient, createServerQueryClient };
