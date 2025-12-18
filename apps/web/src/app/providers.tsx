"use client";

import { TrpcProvider } from "@repo/trpc";
import { AuthProvider } from "@/contexts/auth-context";
import { OrganizationProvider } from "@/contexts/organization-context";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NavigationProvider } from "@/contexts/navigation-context";
import { navigationConfig } from "@/config/navigation.config";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <TrpcProvider>
            <NavigationProvider defaultSections={navigationConfig}>
              {children}
            </NavigationProvider>
          </TrpcProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
