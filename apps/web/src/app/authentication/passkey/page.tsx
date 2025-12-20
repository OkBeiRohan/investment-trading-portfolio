import { PasskeyForm } from "@/components/auth/passkey/form/passkey-form";
import styles from "./passkey.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PasskeyPage() {
  return (
    <main className={styles.passkeyMain}>
      <div className={styles.passkeyContainer}>
        <div className={styles.passkeyHeader}>
          <h1 className={styles.title}>Passkey Authentication</h1>
          <p className={styles.subtitle}>
            Sign in securely using your device or security key
          </p>
        </div>
        <PasskeyForm />
        <Link href="/authentication/login" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
