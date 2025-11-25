import styles from "./magic-link.module.css";

export default function MagicLinkPage() {
  return (
    <main className={styles.magicMain}>
      <div className={styles.magicBox}>
        <h1 className={styles.title}>Magic Link Login</h1>
        <p className={styles.info}>
          Check your email for a magic link to log in.
        </p>
      </div>
    </main>
  );
}
