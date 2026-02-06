"use client";

import { PropsWithChildren } from "react";
import { getQueryClient, trpc, trpcClient } from "./react";
import { QueryClientProvider } from "@tanstack/react-query";

interface TrpcProviderProps extends PropsWithChildren {}

/**
 * Institution-grade tRPC Provider with React Query integration.
 *
 * Features:
 * - Uses proper getQueryClient() for SSR-safe client management
 * - Avoids useState for QueryClient (prevents suspension issues)
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */
export default function TrpcProvider({ children }: TrpcProviderProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const queryClient = getQueryClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
