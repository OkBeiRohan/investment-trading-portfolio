import { Skeleton } from "@/components/loading/skeleton";
import styles from "./verify-phone.module.css";

export default function VerifyPhoneLoading() {
  return (
    <main className={styles.verifyPhoneMain}>
      <div className={styles.verifyPhoneContainer}>
        {/* Header Skeleton */}
        <div className={styles.verifyPhoneHeader}>
          <Skeleton width="100%" height={32} style={{ margin: "0 auto" }} />
          <Skeleton width="85%" height={20} style={{ margin: "0 auto" }} />
        </div>

        {/* Form Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Skeleton width="100%" height={44} />
          <Skeleton variant="rounded" width="100%" height={44} />
        </div>

        {/* Back Link Skeleton */}
        <div style={{ textAlign: "center" }}>
          <Skeleton width={150} height={16} style={{ margin: "0 auto" }} />
        </div>
      </div>
    </main>
  );
}
