"use client";

import { PropsWithChildren } from "react";
import { createTrpcClient, queryClient, trpc } from "./react";
import { QueryClientProvider } from "@tanstack/react-query";

interface TrpcProviderProps extends PropsWithChildren {}

export const trpcClient = createTrpcClient("/api/trpc");

export default function TrpcProvider({ children }: TrpcProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}
