import styles from "./login.module.css";
import { Mail, KeyRound, Smartphone, Fingerprint } from "lucide-react";
import Link from "next/link";
import GitHubIcon from "../../../components/icons/brands/GitHub";
import GoogleIcon from "../../../components/icons/brands/Google";

export default function LoginPage() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Sign In</h1>
        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <Mail className={styles.icon} />
            <input
              type="email"
              placeholder="Email"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <KeyRound className={styles.icon} />
            <input
              type="password"
              placeholder="Password"
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.loginButton}>
            Login
          </button>
        </form>
        <div className={styles.links}>
          <Link href="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
          <span>|</span>
          <Link href="/register" className={styles.link}>
            Sign up
          </Link>
        </div>
        <div className={styles.altLogins}>
          <button className={styles.altButton}>
            <Smartphone className={styles.icon} /> Login with Phone
          </button>
          <button className={styles.altButton}>
            <Fingerprint className={styles.icon} /> Login with Passkey
          </button>
          <button className={styles.altButton}>
            <GoogleIcon className={styles.icon} /> Login with Google
          </button>
          <button className={styles.altButton}>
            <GitHubIcon className={styles.icon} /> Login with GitHub
          </button>
        </div>
      </div>
    </main>
  );
}
