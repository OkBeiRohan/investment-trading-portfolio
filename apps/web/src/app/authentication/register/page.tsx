import { RegisterForm } from "@/components/auth/register/form/register-form";
import styles from "./register.module.css";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className={styles.registerMain}>
      <div className={styles.registerContainer}>
        <div className={styles.registerHeader}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>
            Join Project Quantum and start trading smarter
          </p>
        </div>
        <RegisterForm />
        <p className={styles.loginText}>
          Already have an account?{" "}
          <Link href="/authentication/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
