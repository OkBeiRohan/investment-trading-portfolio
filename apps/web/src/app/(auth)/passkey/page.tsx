import { PasskeyForm } from "@/components/auth/passkey-form";
import styles from "./passkey.module.css";

export default function PasskeyPage() {
  return (
    <main className={styles.passkeyMain}>
      <PasskeyForm />
    </main>
  );
}


