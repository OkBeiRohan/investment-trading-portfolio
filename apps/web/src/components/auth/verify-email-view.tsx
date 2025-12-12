"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "@/app/(auth)/verify-email/verify-email.module.css";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token");
        return;
      }

      try {
        const { data, error } = await authClient.verifyEmail({
          query: { token },
        });

        if (error) {
          setStatus("error");
          setMessage(error.message || "Verification failed");
        } else {
          setStatus("success");
          setMessage("Email verified successfully!");
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    verify();
  }, [token]);

  return (
    <div className={styles.verifyBox}>
      {status === "verifying" && (
        <>
          <div className={styles.iconContainer}>
            <Loader2 className={`${styles.icon} ${styles.loader} animate-spin`} />
          </div>
          <h2 className={styles.title}>Verifying...</h2>
          <p className={styles.message}>{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className={styles.iconContainer}>
            <CheckCircle className={`${styles.icon} ${styles.successIcon}`} />
          </div>
          <h2 className={styles.title}>Verified!</h2>
          <p className={styles.message}>{message}</p>
          <Link href="/login" className={styles.actionButton}>
            Continue to Login
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className={styles.iconContainer}>
            <XCircle className={`${styles.icon} ${styles.errorIcon}`} />
          </div>
          <h2 className={styles.title}>Verification Failed</h2>
          <p className={styles.message}>{message}</p>
          <Link href="/login" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
            Back to Login
          </Link>
        </>
      )}
    </div>
  );
}
