"use client";

import { TrpcProvider } from "@repo/trpc";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider url={`${process.env.NEXT_PUBLIC_API_URL}`}>
      <AuthProvider>{children}</AuthProvider>
    </TrpcProvider>
  );
}
