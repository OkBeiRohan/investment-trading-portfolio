import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.forgotMain}>
      <ForgotPasswordForm />
    </main>
  );
}



