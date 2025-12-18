import type { Metadata } from "next";
import { Providers } from "./providers";
import mainFont from "@/lib/fonts";
import "./globals.css";
import { getAppSettings } from "@/lib/server/settings";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

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
        <Providers>
          <DashboardLayout>{children}</DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}
