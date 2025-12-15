import {
  SkeletonFormGroup,
  SkeletonButton,
  SkeletonLink,
  SkeletonDivider,
  SkeletonSocialButton,
  SkeletonText,
} from "@/components/loading/skeleton";
import styles from "./login.module.css";

export default function LoginLoading() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginContainer}>
        {/* Login Header Skeleton */}
        <div className={styles.loginHeader}>
          <SkeletonText lines={1} width="200px" />
          <SkeletonText lines={1} width="280px" />
        </div>

        {/* Login Form Skeleton */}
        <div className={styles.form}>
          {/* Email Input Skeleton */}
          <SkeletonFormGroup hasLabel hasIcon />

          {/* Password Input Skeleton */}
          <SkeletonFormGroup hasLabel hasIcon />

          {/* Forgot Password Link Skeleton */}
          <div className={styles.links}>
            <SkeletonLink />
          </div>

          {/* Login Button Skeleton */}
          <SkeletonButton fullWidth />
        </div>

        {/* Divider Skeleton */}
        <SkeletonDivider />

        {/* Social Login Options Skeleton */}
        <div>
          {/* Social Buttons Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--spacing-md)",
            }}
          >
            <SkeletonSocialButton />
            <SkeletonSocialButton />
          </div>

          {/* Alternative Login Methods */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--spacing-md)",
              marginTop: "var(--spacing-md)",
            }}
          >
            <SkeletonSocialButton />
            <SkeletonSocialButton />
          </div>
        </div>

        {/* Sign Up Link Skeleton */}
        <div style={{ textAlign: "center", marginTop: "var(--spacing-lg)" }}>
          <SkeletonText lines={1} width="250px" />
        </div>
      </div>
    </main>
  );
}
