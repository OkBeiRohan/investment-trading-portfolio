import { SkeletonInput } from "@/components/form/input/skeleton";
import styles from "./login-form.module.css";
import { Skeleton } from "@/components/loading/skeleton";

export default function SkeletonLoginForm() {
  return (
    <div className={styles.form}>
      <div className={styles.form}>
        <SkeletonInput label icon />
        <SkeletonInput label icon />

        <Skeleton
          variant="text"
          width="50%"
          height={16}
          style={{ marginBottom: 8 }}
        />

        {/* Forgot Password Link Skeleton */}
        <div className={styles.links}>
          <Skeleton width={120} height={16} />
        </div>

        {/* Login Button Skeleton */}
        <Skeleton variant="rounded" width="100%" height={44} />
      </div>
    </div>
  );
}
