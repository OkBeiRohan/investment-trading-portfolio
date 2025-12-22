"use client";

// import { UnifiedSidebar } from "./unified-sidebar";
import { Header } from "./header";
import styles from "@/app/layout.module.css";
import { PropsWithChildren } from "react";

/**
 * DashboardLayout Component
 *
 * Conditionally renders sidebar and header based on current route.
 * Authentication routes get a clean layout without navigation.
 */
export function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className={styles.container}>
      {/* <UnifiedSidebar /> */}
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
