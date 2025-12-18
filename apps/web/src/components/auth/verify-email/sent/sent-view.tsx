"use client";

import { Mail } from "lucide-react";
import styles from "./sent-view.module.css";
import PrimaryButton from "@/components/form/button";
import Link from "next/link";

export function VerifyEmailSentView() {
  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <Mail className={styles.icon} />
      </div>

      <h1 className={styles.title}>Check Your Email</h1>

      <p className={styles.message}>
        We&apos;ve sent a verification link to your email address.
        Please click the link to verify your account.
      </p>

      <div className={styles.actions}>
        <Link href="/authentication/login" className={styles.link}>
          <PrimaryButton type="button" text="Back to Sign In" />
        </Link>
      </div>
    </div>
  );
}
