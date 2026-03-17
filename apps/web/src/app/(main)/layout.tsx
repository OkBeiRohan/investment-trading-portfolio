import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layouts/header";

export default async function Layout({ children }: LayoutProps<"/">) {
  // Server-side session check using Better Auth
  const cookieStore = await cookies();
  const cookiePrefix = process.env.APP_NAME || "better-auth";
  const sessionToken =
    cookieStore.get(`__Secure-${cookiePrefix}.session_token`)?.value ||
    cookieStore.get(`${cookiePrefix}.session_token`)?.value;

  if (!sessionToken) {
    redirect("/authentication/login");
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
