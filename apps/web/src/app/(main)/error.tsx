"use client";

import { useEffect } from "react";
import styles from "./error.module.css";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>⚠️</div>
      <h1 className={styles.errorTitle}>Something went wrong</h1>
      <p className={styles.errorMessage}>
        We encountered an unexpected error while loading the dashboard.
        Please try again or contact support if the problem persists.
      </p>
      {error.digest && (
        <code className={styles.errorCode}>Error ID: {error.digest}</code>
      )}
      <div className={styles.errorActions}>
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => window.location.href = "/"}>
          Go Home
        </Button>
      </div>
    </div>
  );
}
