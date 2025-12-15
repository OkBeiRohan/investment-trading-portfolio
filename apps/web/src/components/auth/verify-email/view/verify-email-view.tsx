"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import styles from "./verify-email-view.module.css";
import { authClient } from "@/lib/auth/auth-client";
import Message from "@/components/form/message";
import PrimaryButton from "@/components/form/button";
import Link from "next/link";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      // Verify email with token
      authClient
        .verifyEmail({ query: { token } })
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            setMessage(error.message || "Verification failed");
          } else {
            setStatus("success");
            setMessage("Your email has been verified successfully!");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Failed to verify email. The link may have expired.");
        });
    } else {
      // No token, just show pending verification message
      setStatus("loading");
      setMessage("Check your email for the verification link");
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // Assuming there's a resend verification endpoint
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setMessage("Verification email sent! Check your inbox.");
    } catch {
      setMessage("Failed to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        {status === "loading" && (
          <Loader2 className={`${styles.icon} ${styles.loading}`} />
        )}
        {status === "success" && (
          <CheckCircle className={`${styles.icon} ${styles.success}`} />
        )}
        {status === "error" && (
          <XCircle className={`${styles.icon} ${styles.error}`} />
        )}
      </div>

      <h1 className={styles.title}>
        {status === "loading" && "Verify Your Email"}
        {status === "success" && "Email Verified!"}
        {status === "error" && "Verification Failed"}
      </h1>

      <Message
        type={
          status === "success"
            ? "success"
            : status === "error"
              ? "error"
              : "info"
        }
      >
        {message}
      </Message>

      {status === "success" && (
        <Link href="/authentication/login" className={styles.link}>
          <PrimaryButton type="button" text="Continue to Sign In" />
        </Link>
      )}

      {status === "loading" && (
        <div className={styles.actions}>
          <p className={styles.resendText}>Didn&apos;t receive the email?</p>
          <PrimaryButton
            type="button"
            text="Resend Verification Email"
            onClick={handleResendEmail}
            loading={resending}
          />
        </div>
      )}

      {status === "error" && (
        <Link href="/authentication/register" className={styles.link}>
          <PrimaryButton type="button" text="Try Registering Again" />
        </Link>
      )}
    </div>
  );
}
