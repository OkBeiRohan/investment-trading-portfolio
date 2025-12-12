import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.resetMain}>
      <ResetPasswordForm />
    </main>
  );
}


