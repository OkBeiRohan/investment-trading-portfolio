import { VerifyEmailSentView } from "@/components/auth/verify-email/sent/sent-view";
import styles from "./sent.module.css";

export default function VerifyEmailSentPage() {
  return (
    <main className={styles.sentMain}>
      <div className={styles.sentContainer}>
        <VerifyEmailSentView />
      </div>
    </main>
  );
}
