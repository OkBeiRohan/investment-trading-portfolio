import { VerifyEmailView } from "@/components/auth/verify-email/view/verify-email-view";
import styles from "./verify-email.module.css";

export default function VerifyEmailPage() {
  return (
    <main className={styles.verifyMain}>
      <div className={styles.verifyContainer}>
        <VerifyEmailView />
      </div>
    </main>
  );
}
