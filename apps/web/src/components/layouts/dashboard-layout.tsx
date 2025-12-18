"use client";

import { usePathname } from "next/navigation";
import { UnifiedSidebar } from "./unified-sidebar";
import { Header } from "./header";
import styles from "@/app/layout.module.css";

/**
 * DashboardLayout Component
 *
 * Conditionally renders sidebar and header based on current route.
 * Authentication routes get a clean layout without navigation.
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Routes that should not have sidebar/header
  const isAuthRoute = pathname.startsWith("/authentication");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className={styles.container}>
      <UnifiedSidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
