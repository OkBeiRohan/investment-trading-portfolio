import { LoginForm } from "@/components/auth/login/form/login-form";
import styles from "./login.module.css";
import Link from "next/link";
import MoreLoginOptions from "@/components/auth/login/more-login/more-login";
import Divider from "@/components/form/divider";
import { StoreCallbackUrl } from "./store-callback-url";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Project Quantum dashboard",
};

export default function LoginPage() {
  return (
    <>
      <StoreCallbackUrl />
      <main className={styles.loginMain}>
        <div className={styles.loginContainer}>
          <div className={styles.loginHeader}>
            <h1 className={styles.title}>Sign In</h1>
            <p className={styles.subtitle}>
              Access your Project Quantum dashboard
            </p>
          </div>
          <LoginForm />
          <Divider text="Or continue with" />
          <MoreLoginOptions />
          <p className={styles.signupText}>
            Not a member?{" "}
            <Link href="/authentication/register" className={styles.link}>
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
