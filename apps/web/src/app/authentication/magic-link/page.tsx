import { MagicLinkForm } from "@/components/auth/magic-link/form/magic-link-form";
import styles from "./magic-link.module.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MagicLinkPage() {
  return (
    <main className={styles.magicMain}>
      <div className={styles.magicContainer}>
        <div className={styles.magicHeader}>
          <h1 className={styles.title}>Sign In with Magic Link</h1>
          <p className={styles.subtitle}>
            We&apos;ll send you a secure link to sign in without a password
          </p>
        </div>
        <MagicLinkForm />
        <Link href="/authentication/login" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} />
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
