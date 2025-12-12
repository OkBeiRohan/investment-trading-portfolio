"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, KeyRound, Loader2, Fingerprint } from "lucide-react";
import GoogleIcon from "@/components/icons/brands/Google";
import GitHubIcon from "../../icons/brands/GitHub";
import styles from "./login-form.module.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      console.log(data);

      if (error) {
        setError(error.message || "Invalid credentials");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className={styles.form}>
      <form className={styles.form} onSubmit={handleCredentialsLogin}>
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

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
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

        <div className={styles.links}>
          <Link href="/authentication/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={styles.loginButton}>
          {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
          Sign in
        </button>

        {error && <div className={styles.error}>{error}</div>}
      </form>

      <div className={styles.divider}>
        <span>Or continue with</span>
      </div>

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

      <p className={styles.signupText}>
        Not a member?{" "}
        <Link href="/authentication/register" className={styles.link}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
