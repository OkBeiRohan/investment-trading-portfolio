import styles from "./passkey.module.css";

export default function PasskeyPage() {
  return (
    <main className={styles.passkeyMain}>
      <div className={styles.passkeyBox}>
        <h1 className={styles.title}>Passkey Authentication</h1>
        <form className={styles.form}>
          <button type="submit" className={styles.passkeyButton}>
            Login/Register with Passkey
          </button>
        </form>
      </div>
    </main>
  );
}
