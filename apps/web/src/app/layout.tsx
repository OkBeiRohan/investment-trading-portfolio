import type { Metadata } from "next";
import { Providers } from "./providers";
import mainFont from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investment Trading Portfolio",
  description: "Algorithmic trading portfolio management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="ltr" lang="en" className={mainFont.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
