import { QueryClient, isServer } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Creates a properly configured QueryClient for SSR.
 * Follows TanStack Query best practices for Next.js App Router.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set staleTime > 0 to avoid immediate refetch on client
        staleTime: 60 * 1000,
        // Disable automatic refetch on window focus for better UX
        refetchOnWindowFocus: false,
        // Retry failed requests for resilience
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

/**
 * Gets or creates a QueryClient following TanStack SSR guidelines.
 *
 * Server: Always creates a new QueryClient to avoid cross-request data leakage.
 * Browser: Reuses a singleton QueryClient to maintain cache across navigation.
 *
 * IMPORTANT: This pattern prevents React from throwing away the client
 * if it suspends during the initial render (when no Suspense boundary exists).
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    // Server: Always create new client to prevent cross-request leakage
    return makeQueryClient();
  } else {
    // Browser: Singleton pattern prevents client recreation on suspend
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Creates a fresh QueryClient for Server Component prefetching.
 * Use this when you want explicit control over the QueryClient lifecycle.
 */
export function createServerQueryClient(): QueryClient {
  return makeQueryClient();
}
