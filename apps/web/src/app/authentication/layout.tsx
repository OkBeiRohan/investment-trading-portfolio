"use client";

import { useState } from "react";
import InformationPanel from "@/components/auth/layout/information.panel";
import styles from "./auth.module.css";
import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: LayoutProps<"/authentication">) {
  const pathname = usePathname();
  const [showForm, setShowForm] = useState(false);
  const isLoginPage = pathname === "/authentication/login";

  return (
    <div className={styles.authRoot}>
      <InformationPanel
        onGetStarted={() => setShowForm(true)}
        showForm={showForm}
        isLoginPage={isLoginPage}
      />
      <div
        className={`${styles.formContainer} ${showForm ? styles.formVisible : ""}`}
        data-show={showForm}
      >
        {children}
      </div>
    </div>
  );
}
