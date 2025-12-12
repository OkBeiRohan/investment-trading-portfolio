"use client";

import GitHubIcon from "@/components/icons/brands/GitHub";
import GoogleIcon from "@/components/icons/brands/Google";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Fingerprint } from "lucide-react";
import { useState } from "react";
import styles from "./more-login.module.css";
import Link from "next/link";

export default function MoreLoginOptions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSocialLogin = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      const { data, error } = await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });

      if (error) {
        setError(error.message || `Failed to login with ${provider}`);
        setLoading(false);
      }

      console.log(data);
    } catch (err) {
      setError(`Failed to login with ${provider}`);
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <div>
      <div className={styles.socialButtons}>
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={loading}
          className={styles.socialButton}
        >
          <GoogleIcon className={styles.icon} />
          Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("github")}
          disabled={loading}
          className={styles.socialButton}
        >
          <GitHubIcon className={styles.icon} />
          GitHub
        </button>
      </div>

      <div className={styles.altLogins}>
        <Link
          href="/authentication/magic-link"
          className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
        >
          <Mail className={styles.icon} />
          Magic Link
        </Link>
        <Link
          href="/authentication/passkey"
          className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
        >
          <Fingerprint className={styles.icon} />
          Passkey
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
