import { Skeleton } from "@/components/loading/skeleton";
import styles from "./verify-email.module.css";

export default function VerifyEmailLoading() {
  return (
    <main className={styles.verifyMain}>
      <div className={styles.verifyBox}>
        {/* Icon Skeleton */}
        <div className={styles.iconContainer}>
          <Skeleton variant="circular" width={48} height={48} />
        </div>

        {/* Content Skeleton */}
        <div>
          <Skeleton width="80%" height={32} style={{ margin: "0 auto 1rem" }} />
          <Skeleton
            width="90%"
            height={20}
            style={{ margin: "0 auto 0.5rem" }}
          />
          <Skeleton width="75%" height={20} style={{ margin: "0 auto" }} />
        </div>
      </div>
    </main>
  );
}
