import styles from "./verify-phone.module.css";

export default function VerifyPhonePage() {
  return (
    <main className={styles.verifyMain}>
      <div className={styles.verifyBox}>
        <h1 className={styles.title}>Verify Phone</h1>
        <form className={styles.form}>
          <input
            type="text"
            placeholder="Enter OTP"
            className={styles.input}
            required
          />
          <button type="submit" className={styles.verifyButton}>
            Verify
          </button>
        </form>
      </div>
    </main>
  );
}
