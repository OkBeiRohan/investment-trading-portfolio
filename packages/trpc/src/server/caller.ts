import "server-only"; // Ensure this file cannot be imported from client

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { AppRouter } from "./server";
import { appRouter } from "./server";
import { getQueryClient } from "../client/query-client";

// IMPORTANT: Create a stable getter for the query client that
// will return the same client during the same request.
export const getServerQueryClient = cache(getQueryClient);

// tRPC Options Proxy for Server Components
//
// This is the RECOMMENDED way to use tRPC in Server Components per official docs.
// It integrates with React Query for prefetching and hydration.
//
// Use this to:
// - Prefetch queries in Server Components
// - Hydrate queries to Client Components (wrap with HydrateClient)
// - Enable streaming with Suspense
export const trpc = createTRPCOptionsProxy({
  // For same-process backend (NestJS in same monorepo)
  // Pass router and context directly
  router: appRouter,
  ctx: async () => {
    // Create context with cookies from Next.js request
    const cookieStore = await cookies();
    const requestHeaders = await headers();

    return {
      cookies: cookieStore,
      headers: requestHeaders,
    };
  },
  queryClient: getServerQueryClient,
});

// Server Caller for Direct Data Fetching
//
// Use this when you need data in a Server Component and DON'T want to hydrate to client.
// This is detached from QueryClient and does not cache data.
//
// WARNING: Data fetched this way is NOT available in Client Components.
// If you need data on both server and client, use prefetch() instead.
export const caller = appRouter.createCaller(async () => {
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  return {
    cookies: cookieStore,
    headers: requestHeaders,
  };
});

// HydrateClient Component
//
// Wraps children with HydrationBoundary to hydrate prefetched queries to client.
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getServerQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

// Prefetch Helper
//
// Prefetches a query in a Server Component and makes it available to Client Components.
// Use void prefetch() to start fetch without blocking render.
// Use await prefetch() to wait for data before HTML (slower page load, no loading state).
export function prefetch<T extends ReturnType<any>>(
  queryOptions: T,
): Promise<void> {
  const queryClient = getServerQueryClient();

  // @ts-expect-error - queryOptions type is complex
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // @ts-expect-error - queryOptions type is complex
    return queryClient.prefetchInfiniteQuery(queryOptions);
  } else {
    return queryClient.prefetchQuery(queryOptions);
  }
}
