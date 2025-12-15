import { RegisterForm } from "@/components/auth/register/form/register-form";
import MoreRegisterOptions from "@/components/auth/register/more-register-options/more-register-options";
import Divider from "@/components/form/divider";
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
        <Divider text="Or sign up with" />
        <MoreRegisterOptions />
        <p className={styles.signupText}>
          Already have an account?{" "}
          <Link href="/authentication/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
