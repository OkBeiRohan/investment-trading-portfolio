import { LoginForm } from "@/components/auth/login/form/login-form";
import styles from "./login.module.css";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Project Quantum dashboard",
};

export default function LoginPage() {
  return (
    <div className={styles.loginContainer}>
      <LoginForm />
      <p className={styles.signupText}>
        Not a member?{" "}
        <Link href="/authentication/register" className={styles.link}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
