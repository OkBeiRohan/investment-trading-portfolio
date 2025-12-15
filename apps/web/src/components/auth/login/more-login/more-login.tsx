"use client";

import GitHubIcon from "@/components/icons/brands/GitHub";
import GoogleIcon from "@/components/icons/brands/Google";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Fingerprint, User } from "lucide-react";
import { useState } from "react";
import styles from "./more-login.module.css";
import Link from "next/link";
import { handleAuthSuccess } from "@/lib/actions/authentication";

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
      } else {
        await handleAuthSuccess();
      }

      console.log(data);
    } catch (err) {
      setError(`Failed to login with ${provider}`);
      setLoading(false);
      console.log(err);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await authClient.signIn.anonymous();
      if (error) {
        setError(error.message || "Failed to login anonymously");
        setLoading(false);
      } else {
        await handleAuthSuccess();
      }
      console.log(data);
    } catch (err) {
      setError("Failed to login anonymously");
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <div className={styles.moreContainer}>
      <Link
        href="/authentication/magic-link"
        className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
      >
        <Mail className={styles.icon} />
        Login with OTP
      </Link>
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
          href="/authentication/passkey"
          className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
        >
          <Fingerprint className={styles.icon} />
          Passkey
        </Link>
      </div>

      <button
        type="button"
        onClick={handleAnonymousLogin}
        disabled={loading}
        className={styles.altButton}
      >
        <User className={styles.icon} />
        Continue as Guest
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
