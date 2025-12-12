"use client";

import { TrpcProvider } from "@repo/trpc";
import { AuthProvider } from "@/contexts/auth-context";
import { OrganizationProvider } from "@/contexts/organization-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider url={`/api/trpc`}>
      <AuthProvider>
        <OrganizationProvider>{children}</OrganizationProvider>
      </AuthProvider>
    </TrpcProvider>
  );
}
