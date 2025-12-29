import { TrpcProvider } from "@repo/trpc";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}
