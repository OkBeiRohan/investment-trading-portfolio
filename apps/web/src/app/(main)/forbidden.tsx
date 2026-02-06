import Link from "next/link";
import styles from "./error.module.css";

export default function ForbiddenPage() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.forbiddenIcon}>🚫</div>
      <h1 className={styles.errorTitle}>Access Denied</h1>
      <p className={styles.errorMessage}>
        You don&apos;t have permission to access this resource. Please contact
        your administrator if you believe this is an error.
      </p>
      <div className={styles.errorActions}>
        <Link
          href="/"
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
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
