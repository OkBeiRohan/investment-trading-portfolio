"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import styles from "@/app/(auth)/reset-password/reset-password.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Missing reset token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.resetPassword({
        newPassword: password,
        token: token,
      });

      if (error) {
        setError(error.message || "Failed to reset password");
      } else {
        router.push("/login?reset=success");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.resetBox}>
      <h1 className={styles.title}>Set new password</h1>
      <p className={styles.subtitle}>
        Your new password must be different from previous used passwords
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleResetPassword}>
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            New Password
          </label>
          <div className={styles.inputWrapper}>
            <KeyRound className={styles.icon} />
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <div className={styles.inputWrapper}>
            <KeyRound className={styles.icon} />
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className={styles.submitButton}
        >
          {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
          Reset Password
        </button>
      </form>

      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to sign in
      </Link>
    </div>
  );
}
