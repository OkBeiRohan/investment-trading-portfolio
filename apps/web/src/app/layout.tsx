import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getAppSettings } from "@/lib/server/settings";
import mainFont from "@/lib/fonts";
import { Providers } from "./providers";
import { AuthVerifier } from "@/verifiers/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quantum Trades and Investment",
    template: "%s | Quantum Trades and Investment",
  },
  description: "Algorithmic trading portfolio management system",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getAppSettings();
  const lang = settings.language || "en";
  const theme = settings.theme || "light";

  return (
    <html
      dir="ltr"
      lang={lang}
      data-theme={theme}
      className={mainFont.className}
    >
      <body>
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
        <AuthVerifier />
      </body>
    </html>
  );
}
