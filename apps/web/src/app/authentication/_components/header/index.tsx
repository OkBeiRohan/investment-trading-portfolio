import styles from "./header.module.css";

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}
export default function AuthHeader({
  title = "Your Account",
  subtitle = "Access your Quantum Trades dashboard",
}: AuthHeaderProps) {
  return (
    <div className={styles.authHeader}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
