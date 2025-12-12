/**
 * tRPC Provider
 *
 * Provides tRPC client to the application.
 * Uses React Query for caching and state management.
 */

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import { trpc } from "./client";

interface TrpcProviderProps {
  children: ReactNode;
  url?: string;
}

export function TrpcProvider({ children, url }: TrpcProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: url || `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include", // Send cookies for auth
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
