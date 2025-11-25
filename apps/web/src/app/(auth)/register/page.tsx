import styles from "./register.module.css";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className={styles.registerMain}>
      <div className={styles.registerBox}>
        <h1 className={styles.title}>Create Account</h1>
        <form className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Phone (optional)"
            className={styles.input}
          />
          <button type="submit" className={styles.registerButton}>
            Register
          </button>
        </form>
        <div className={styles.links}>
          <Link href="/login" className={styles.link}>
            Already have an account?
          </Link>
        </div>
      </div>
    </main>
  );
}
