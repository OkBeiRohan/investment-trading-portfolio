import { RegisterForm } from "@/components/auth/register-form";
import styles from "./register.module.css";

export default function RegisterPage() {
  return (
    <main className={styles.registerMain}>
      <RegisterForm />
    </main>
  );
}


