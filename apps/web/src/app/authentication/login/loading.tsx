import styles from "./login.module.css";

export default function LoginLoading() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>
            Access your Project Quantum dashboard
          </p>
        </div>
        <div>Please Wait...</div>
        <div className={styles.divider}>
          <span>Or continue with</span>
        </div>
        <div>Please Wait...</div>
      </div>
    </main>
  );
}
