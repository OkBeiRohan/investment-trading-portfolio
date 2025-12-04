"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "@/app/(auth)/2fa/2fa.module.css";

export function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.twoFactor.verifyOtp({
        code,
      });

      if (error) {
        setError(error.message || "Invalid code");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.twofaBox}>
      <div className={styles.iconContainer}>
        <ShieldCheck className={styles.icon} />
      </div>
      <h1 className={styles.title}>Two-Factor Authentication</h1>
      <p className={styles.subtitle}>
        Enter the 6-digit code from your authenticator app
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleVerify}>
        <div className={styles.inputGroup}>
          <input
            id="code"
            name="code"
            type="text"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={styles.input}
            placeholder="000000"
            maxLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.verifyButton}
        >
          {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
          Verify
        </button>
      </form>

      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to sign in
      </Link>
    </div>
  );
}
