import { ForgotPasswordForm } from "@/components/auth/forgot-password/form/forgot-password-form";
import styles from "./forgot-password.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.forgotMain}>
      <div className={styles.forgotContainer}>
        <div className={styles.forgotHeader}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>
        <ForgotPasswordForm />
        <Link href="/authentication/login" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
