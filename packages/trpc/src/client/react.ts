import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../server";
import { getQueryClient } from "./query-client";
import { authLink } from "./auth-link";
import { authClient } from "@repo/auth-client";

/**
 * tRPC React client with classic API.
 * Provides simpler hooks: trpc.router.procedure.useQuery() instead of useQuery(trpc.router.procedure.queryOptions())
 */
export const trpc = createTRPCReact<AppRouter>();

export const queryClient = getQueryClient();

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
