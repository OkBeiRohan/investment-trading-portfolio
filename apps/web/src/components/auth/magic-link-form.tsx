"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import styles from "@/app/(auth)/magic-link/magic-link.module.css";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      });

      if (error) {
        setError(error.message || "Failed to send magic link");
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
    <div className={styles.magicBox}>
      <h1 className={styles.title}>Magic Link Login</h1>
      <p className={styles.subtitle}>Sign in without a password</p>

      {success ? (
        <div className={styles.success}>
          <div>
            <CheckCircle className={styles.icon} style={{ color: "#047857" }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: "4px" }}>
              Check your email
            </h3>
            <p>We sent a magic link to {email}. Click it to sign in.</p>
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

          <form className={styles.form} onSubmit={handleMagicLink}>
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
              Send Magic Link
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
