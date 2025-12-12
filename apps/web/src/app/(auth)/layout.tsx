import styles from "./auth.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.authRoot}>
      <div className={styles.informationPanel}>
        Welcome to Investment and Trading
      </div>
      {children}
    </div>
  );
}
