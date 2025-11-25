import styles from "./social-callback.module.css";

export default function SocialCallbackPage() {
  return (
    <main className={styles.callbackMain}>
      <div className={styles.callbackBox}>
        <h1 className={styles.title}>Social Login Callback</h1>
        <p className={styles.info}>Processing your login...</p>
      </div>
    </main>
  );
}
