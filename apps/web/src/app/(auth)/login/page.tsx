import { LoginForm } from "@/components/auth/login-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.loginMain}>
      <LoginForm />
    </main>
  );
}


