import type { Metadata } from "next";
import { Providers } from "./providers";
import mainFont from "@/lib/fonts";
import "./globals.css";
import { getAppSettings, resolveEffectiveTheme } from "@/lib/server/settings";

export const metadata: Metadata = {
  title: "Investment Trading Portfolio",
  description: "Algorithmic trading portfolio management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getAppSettings();
  const effectiveTheme = await resolveEffectiveTheme();
  const lang = settings.language || "en";

  return (
    <html
      dir="ltr"
      lang={lang}
      data-theme={effectiveTheme}
      className={mainFont.className}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
