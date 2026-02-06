import Link from "next/link";
import styles from "./error.module.css";

export default function NotFound() {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.notFoundIcon}>🔍</div>
      <h1 className={styles.errorTitle}>Page Not Found</h1>
      <p className={styles.errorMessage}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or navigate back to the dashboard.
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
