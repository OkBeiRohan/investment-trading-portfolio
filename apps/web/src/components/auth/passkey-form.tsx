"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Fingerprint, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/app/authentication/passkey/passkey.module.css";

export function PasskeyForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.passkey();

      if (error) {
        setError(error.message || "Passkey authentication failed");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.passkeyBox}>
      <div className={styles.iconContainer}>
        <Fingerprint className={styles.icon} />
      </div>
      <h1 className={styles.title}>Passkey Login</h1>
      <p className={styles.subtitle}>
        Use your device's biometrics or security key
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handlePasskeyLogin}>
        <button type="submit" disabled={loading} className={styles.authButton}>
          {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
          Authenticate with Passkey
        </button>
      </form>

      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to sign in
      </Link>
    </div>
  );
}
