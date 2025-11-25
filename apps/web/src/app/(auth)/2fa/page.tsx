import styles from "./2fa.module.css";

export default function TwoFAPage() {
  return (
    <main className={styles.twofaMain}>
      <div className={styles.twofaBox}>
        <h1 className={styles.title}>Two-Factor Authentication</h1>
        <form className={styles.form}>
          <input
            type="text"
            placeholder="Enter 2FA code"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.twofaButton}>
            Verify
          </button>
        </form>
      </div>
    </main>
  );
}
