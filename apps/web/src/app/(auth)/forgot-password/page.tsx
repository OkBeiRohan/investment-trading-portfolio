import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.forgotMain}>
      <div className={styles.forgotBox}>
        <h1 className={styles.title}>Forgot Password</h1>
        <form className={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.forgotButton}>
            Send Reset Link
          </button>
        </form>
      </div>
    </main>
  );
}
