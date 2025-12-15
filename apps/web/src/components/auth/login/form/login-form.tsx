"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, KeyRound, Loader2 } from "lucide-react";
import styles from "./login-form.module.css";
import { useTRPC, useTRPCClient } from "@repo/trpc";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

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
      <button
        onClick={async () => {
          const a = trpc.api.getVersion.queryOptions();
        }}
      >
        Use TRPC
      </button>
      <button
        onClick={() => {
          trpcClient.api.getVersion.query();
        }}
      >
        Use TRPC Client
      </button>
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
    </div>
  );
}
