import Link from "next/link";
import styles from "./error.module.css";

export default function UnauthorizedPage() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.unauthorizedIcon}>🔒</div>
      <h1 className={styles.errorTitle}>Authentication Required</h1>
      <p className={styles.errorMessage}>
        You need to be logged in to access this page.
        Please sign in to continue.
      </p>
      <div className={styles.errorActions}>
        <Link
          href="/authentication/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--spacing-sm) var(--spacing-lg)",
            backgroundColor: "var(--color-primary)",
            color: "white",
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Sign In
        </Link>
        <Link
          href="/authentication/register"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--spacing-sm) var(--spacing-lg)",
            backgroundColor: "transparent",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            textDecoration: "none",
            fontWeight: "var(--font-weight-medium)",
          }}
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}
