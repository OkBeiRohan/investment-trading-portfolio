import { EmailOtpForm } from "@/components/auth/email-otp/form/email-otp-form";
import styles from "./email-otp.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EmailOtpPage() {
  return (
    <main className={styles.otpMain}>
      <div className={styles.otpContainer}>
        <div className={styles.otpHeader}>
          <h1 className={styles.title}>Sign In with Email OTP</h1>
          <p className={styles.subtitle}>
            We&apos;ll send you a verification code to your email
          </p>
        </div>
        <EmailOtpForm />
        <Link href="/authentication/login" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
