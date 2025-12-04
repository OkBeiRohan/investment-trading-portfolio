import { TwoFactorForm } from "@/components/auth/two-factor-form";
import styles from "./2fa.module.css";

export default function TwoFAPage() {
  return (
    <main className={styles.twofaMain}>
      <TwoFactorForm />
    </main>
  );
}


