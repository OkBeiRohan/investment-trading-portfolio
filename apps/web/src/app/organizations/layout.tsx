import React from "react";
import { MainSidebar } from "@/components/layouts/Sidebar";
import styles from "@/app/layout.module.css";

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <MainSidebar />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

