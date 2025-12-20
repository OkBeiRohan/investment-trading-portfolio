import { Skeleton } from "@/components/loading/skeleton";
import styles from "./login.module.css";
import SkeletonLoginForm from "@/components/auth/login/form/skeleton";

export default function LoginLoading() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginContainer}>
        {/* Login Header Skeleton */}
        <div className={styles.loginHeader}>
          <Skeleton width="200px" height={32} />
          <Skeleton width="280px" height={20} />
        </div>

        {/* Login Form Skeleton */}
        <div className={styles.form}>
          <SkeletonLoginForm />

          {/* Forgot Password Link Skeleton */}
          <div className={styles.links}>
            <Skeleton width={120} height={16} />
          </div>

          {/* Login Button Skeleton */}
          <Skeleton variant="rounded" width="100%" height={44} />
        </div>

        {/* Divider Skeleton */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-md)",
            margin: "var(--spacing-lg) 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-border-primary)",
            }}
          />
          <Skeleton width={140} height={14} />
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-border-primary)",
            }}
          />
        </div>

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
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--spacing-sm)",
                  border: "1px solid var(--color-input-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  minHeight: 44,
                  background: "var(--color-input-bg)",
                }}
              >
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton width={80} height={16} />
              </div>
            ))}
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
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--spacing-sm)",
                  border: "1px solid var(--color-input-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--spacing-sm) var(--spacing-md)",
                  minHeight: 44,
                  background: "var(--color-input-bg)",
                }}
              >
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton width={80} height={16} />
              </div>
            ))}
          </div>
        </div>

        {/* Sign Up Link Skeleton */}
        <div style={{ textAlign: "center", marginTop: "var(--spacing-lg)" }}>
          <Skeleton width={250} height={16} />
        </div>
      </div>
    </main>
  );
}
