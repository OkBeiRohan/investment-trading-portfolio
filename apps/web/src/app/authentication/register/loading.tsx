import { Skeleton } from "@/components/loading/skeleton";
import styles from "./register.module.css";

export default function RegisterLoading() {
  return (
    <main className={styles.registerMain}>
      <div className={styles.registerBox}>
        {/* Header Skeleton */}
        <div>
          <Skeleton width="100%" height={40} style={{ marginBottom: "1rem" }} />
          <Skeleton width="80%" height={20} style={{ margin: "0 auto" }} />
        </div>

        {/* Form Skeleton */}
        <div className={styles.form}>
          <div className={styles.inputGroup}>
            <Skeleton width={100} height={20} />
            <Skeleton width="100%" height={44} />
          </div>
          <div className={styles.inputGroup}>
            <Skeleton width={100} height={20} />
            <Skeleton width="100%" height={44} />
          </div>
          <div className={styles.inputGroup}>
            <Skeleton width={120} height={20} />
            <Skeleton width="100%" height={44} />
          </div>
          <Skeleton variant="rounded" width="100%" height={44} />
        </div>

        {/* Footer Skeleton */}
        <div style={{ textAlign: "center" }}>
          <Skeleton width={250} height={16} style={{ margin: "0 auto" }} />
        </div>
      </div>
    </main>
  );
}
