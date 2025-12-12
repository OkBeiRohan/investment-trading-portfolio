"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import styles from "@/app/(auth)/forgot-password/forgot-password.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      if (error) {
        setError(error.message || "Failed to send reset link");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.forgotBox}>
      <h1 className={styles.title}>Reset password</h1>
      <p className={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your password
      </p>

      {success ? (
        <div className={styles.success}>
          <div>
            <CheckCircle className={styles.icon} style={{ color: "#047857" }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: "4px" }}>
              Check your email
            </h3>
            <p>We sent a password reset link to {email}.</p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className={styles.resetLink}
            >
              Try another email
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleForgotPassword}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.icon} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
              Send Reset Link
            </button>
          </form>
        </>
      )}

      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to sign in
      </Link>
    </div>
  );
}
