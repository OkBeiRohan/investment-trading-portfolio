import { TwoFactorForm } from "@/components/auth/2fa/form/two-factor-form";
import styles from "./2fa.module.css";

export default function TwoFAPage() {
  return (
    <main className={styles.twofaMain}>
      <div className={styles.twofaContainer}>
        <div className={styles.twofaHeader}>
          <h1 className={styles.title}>Two-Factor Authentication</h1>
          <p className={styles.subtitle}>
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        <TwoFactorForm />
      </div>
    </main>
  );
}
