"use client";

import { TrpcProvider } from "@/lib/trpc/provider";
import { AuthProvider } from "@/contexts/auth-context";
import { OrganizationProvider } from "@/contexts/organization-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider url={`${process.env.NEXT_PUBLIC_API_URL}/trpc`}>
      <AuthProvider>
        <OrganizationProvider>{children}</OrganizationProvider>
      </AuthProvider>
    </TrpcProvider>
  );
}
