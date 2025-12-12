import { LoginForm } from "@/components/auth/login/login-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginHeader}>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Access your Project Quantum dashboard</p>
      </div>
      <LoginForm />
    </main>
  );
}
