import { LoginForm } from "@/components/auth/login/form/login-form";
import styles from "./login.module.css";
import Link from "next/link";
import MoreLoginOptions from "@/components/auth/login/more-login/more-login";

export default function LoginPage() {
  return (
    <main className={styles.loginMain}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>
            Access your Project Quantum dashboard
          </p>
        </div>
        <LoginForm />
        <div className={styles.divider}>
          <span>Or continue with</span>
        </div>
        <MoreLoginOptions />
        <p className={styles.signupText}>
          Not a member?{" "}
          <Link href="/authentication/register" className={styles.link}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
