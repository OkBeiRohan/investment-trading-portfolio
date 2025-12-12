"use client";

import { PropsWithChildren } from "react";
import { createTrpcClient, queryClient, trpc } from "./react";
import { QueryClientProvider } from "@tanstack/react-query";

interface TrpcProviderProps extends PropsWithChildren {}

export const trpcClient = createTrpcClient("/api/trpc");

export default function TrpcProvider({ children }: TrpcProviderProps) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
