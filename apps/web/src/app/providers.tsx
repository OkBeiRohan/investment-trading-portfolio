import { TrpcProvider } from "@repo/trpc";
import { AuthProvider } from "@/contexts/auth-context";
import { OrganizationProvider } from "@/contexts/organization-context";
import { ThemeProvider } from "@/components/theme/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <TrpcProvider>{children}</TrpcProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
