"use client";

import { PropsWithChildren } from "react";
import { queryClient, trpc, trpcClient } from "./react";
import { QueryClientProvider } from "@tanstack/react-query";

interface TrpcProviderProps extends PropsWithChildren {}

/**
 * tRPC Provider using classic React Query integration.
 * Wraps app with tRPC client and React Query context.
 */
export default function TrpcProvider({ children }: TrpcProviderProps) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
