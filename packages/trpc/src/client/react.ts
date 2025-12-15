import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../server";
import { getQueryClient } from "./query-client";

/**
 * tRPC React client with classic API.
 * Provides simpler hooks: trpc.router.procedure.useQuery() instead of useQuery(trpc.router.procedure.queryOptions())
 */
export const trpc = createTRPCReact<AppRouter>();

export const queryClient = getQueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      // transformer: superjson, // Uncomment if using superjson for Date/Map/Set serialization
    }),
  ],
});
