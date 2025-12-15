"use client";

import GitHubIcon from "@/components/icons/brands/GitHub";
import GoogleIcon from "@/components/icons/brands/Google";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, Fingerprint, Phone } from "lucide-react";
import { useState } from "react";
import styles from "./more-register-options.module.css";
import Link from "next/link";
import { handleAuthSuccess } from "@/lib/actions/authentication";

export default function MoreRegisterOptions() {
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
        setError(error.message || `Failed to sign up with ${provider}`);
        setLoading(false);
      } else {
        await handleAuthSuccess();
      }

      console.log(data);
    } catch (err) {
      setError(`Failed to sign up with ${provider}`);
      setLoading(false);
      console.log(err);
    }
  };

  return (
    <div className={styles.moreContainer}>
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
          Sign up with Email Link
        </Link>
        <Link
          href="/authentication/verify-phone"
          className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
        >
          <Phone className={styles.icon} />
          Sign up with Phone OTP
        </Link>
        <Link
          href="/authentication/passkey"
          className={`${styles.altButton} ${loading ? styles.disabledLink : ""}`}
        >
          <Fingerprint className={styles.icon} />
          Sign up with Passkey
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
