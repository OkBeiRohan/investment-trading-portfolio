import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layouts/header";
import { Sidebar } from "@/components/layouts/sidebar";
import styles from "./layout.module.css";

export default async function Layout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const cookiePrefix = process.env.APP_NAME || "better-auth";
  const sessionToken =
    cookieStore.get(`__Secure-${cookiePrefix}.session_token`)?.value ||
    cookieStore.get(`${cookiePrefix}.session_token`)?.value;

  if (!sessionToken) {
    redirect("/authentication/login");
  }

  return (
    <div className={styles.appLayout}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Header />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
