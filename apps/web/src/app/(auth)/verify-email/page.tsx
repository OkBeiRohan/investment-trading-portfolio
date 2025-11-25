import styles from "./verify-email.module.css";

export default function VerifyEmailPage() {
  return (
    <main className={styles.verifyMain}>
      <div className={styles.verifyBox}>
        <h1 className={styles.title}>Verify Email</h1>
        <p className={styles.info}>
          Please check your inbox for a verification link.
        </p>
      </div>
    </main>
  );
}
