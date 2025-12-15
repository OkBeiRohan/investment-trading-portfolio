"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import styles from "./login-form.module.css";
import Input from "@/components/form/input";

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

  return (
    <div className={styles.form}>
      <form className={styles.form} onSubmit={handleCredentialsLogin}>
        <Input
          type="email"
          name="email"
          label="Email Address"
          icon={<Mail />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          name="password"
          label="Password"
          icon={<KeyRound />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
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
    </div>
  );
}
