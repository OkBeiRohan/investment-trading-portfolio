import styles from "./reset-password.module.css";

export default function ResetPasswordPage() {
  return (
    <main className={styles.resetMain}>
      <div className={styles.resetBox}>
        <h1 className={styles.title}>Reset Password</h1>
        <form className={styles.form}>
          <input
            type="password"
            placeholder="New password"
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.resetButton}>
            Reset Password
          </button>
        </form>
      </div>
    </main>
  );
}
