import { TrpcProvider } from "@repo/trpc";
import { ThemeProvider } from "@/components/theme/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TrpcProvider>{children}</TrpcProvider>
    </ThemeProvider>
  );
}
