"use client";

import { PropsWithChildren } from "react";
import { queryClient, trpcClient } from "./react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider } from "./hooks";

interface TrpcProviderProps extends PropsWithChildren {}

export default function TrpcProvider({ children }: TrpcProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
