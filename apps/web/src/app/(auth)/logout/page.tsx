import styles from "./logout.module.css";

export default function LogoutPage() {
  return (
    <main className={styles.logoutMain}>
      <div className={styles.logoutBox}>
        <h1 className={styles.title}>Logged Out</h1>
        <p className={styles.info}>You have been logged out.</p>
      </div>
    </main>
  );
}
