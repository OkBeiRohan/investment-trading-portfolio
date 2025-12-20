import { Skeleton } from "@/components/loading/skeleton";
import styles from "./magic-link.module.css";

export default function MagicLinkLoading() {
  return (
    <main className={styles.magicMain}>
      <div className={styles.magicBox}>
        {/* Header Skeleton */}
        <div>
          <Skeleton width="100%" height={40} style={{ marginBottom: "1rem" }} />
          <Skeleton width="85%" height={20} style={{ margin: "0 auto" }} />
        </div>

        {/* Form Skeleton */}
        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <Skeleton width={100} height={20} />
            <Skeleton width="100%" height={44} />
          </div>
          <Skeleton variant="rounded" width="100%" height={44} />
        </div>

        {/* Footer Skeleton */}
        <div style={{ textAlign: "center" }}>
          <Skeleton width={220} height={16} style={{ margin: "0 auto" }} />
        </div>
      </div>
    </main>
  );
}
