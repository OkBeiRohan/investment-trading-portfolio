import { Skeleton } from "@/components/loading/skeleton";
import styles from "./login.module.css";
import SkeletonLoginForm from "@/components/auth/login/form/skeleton";

export default function LoginLoading() {
  return (
    <div className={styles.loginContainer}>
      {/* Login Form Skeleton */}
      <SkeletonLoginForm />

      {/* Sign Up Link Skeleton */}
      <div style={{ textAlign: "center", marginTop: "var(--spacing-lg)" }}>
        <Skeleton width={250} height={16} />
      </div>
    </div>
  );
}
