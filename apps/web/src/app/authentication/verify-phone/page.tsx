import { PhoneNumberForm } from "@/components/auth/phone-number/form/phone-number-form";
import styles from "./verify-phone.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function VerifyPhonePage() {
  return (
    <main className={styles.verifyPhoneMain}>
      <div className={styles.verifyPhoneContainer}>
        <div className={styles.verifyPhoneHeader}>
          <h1 className={styles.title}>Sign In with Phone Number</h1>
          <p className={styles.subtitle}>
            We&apos;ll send you a one-time password to verify your identity
          </p>
        </div>
        <PhoneNumberForm />
        <Link href="/authentication/login" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
