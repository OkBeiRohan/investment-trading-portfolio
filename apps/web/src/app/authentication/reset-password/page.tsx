import { ResetPasswordForm } from "@/components/auth/reset-password/form/reset-password-form";
import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.resetMain}>
      <div className={styles.resetContainer}>
        <div className={styles.resetHeader}>
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>
            Choose a strong password for your account
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
