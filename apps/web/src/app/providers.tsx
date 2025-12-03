"use client";

import { TrpcProvider } from "@repo/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider url={`${process.env.NEXT_PUBLIC_API_URL}`}>
      {children}
    </TrpcProvider>
  );
}
