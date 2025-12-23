import { Header } from "@/components/layouts/header";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
