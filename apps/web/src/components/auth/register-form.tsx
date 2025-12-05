"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, KeyRound, User, Loader2 } from "lucide-react";
import styles from "@/app/(auth)/register/register.module.css";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        setError(error.message || "Registration failed");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerBox}>
      <h1 className={styles.title}>Create Account</h1>
      <p className={styles.subtitle}>Join Project Quantum and start trading</p>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleRegister}>
        <div className={styles.inputGroup}>
          <label htmlFor="name" className={styles.label}>
            Full Name
          </label>
          <div className={styles.inputWrapper}>
            <User className={styles.icon} />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="John Doe"
            />
          </div>
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className={styles.registerButton}
        >
          {loading && <Loader2 className={`${styles.icon} animate-spin`} />}
          Create account
        </button>
      </form>

      <p className={styles.loginText}>
        Already have an account?{" "}
        <Link href="/login" className={styles.link}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
