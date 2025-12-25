import styles from "./default.module.css";

export default function DefaultAuthHeader() {
  return (
    <div className={styles.loginHeader}>
      <h1 className={styles.title}>Sign In</h1>
      <p className={styles.subtitle}>Access your Project Quantum dashboard</p>
    </div>
  );
}
