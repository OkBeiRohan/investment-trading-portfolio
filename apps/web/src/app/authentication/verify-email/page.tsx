import { VerifyEmailView } from "@/components/auth/verify-email-view";
import styles from "./verify-email.module.css";

export default function VerifyEmailPage() {
  return (
    <main className={styles.verifyMain}>
      <VerifyEmailView />
    </main>
  );
}


