import { MagicLinkForm } from "@/components/auth/magic-link-form";
import styles from "./magic-link.module.css";

export default function MagicLinkPage() {
  return (
    <main className={styles.magicMain}>
      <MagicLinkForm />
    </main>
  );
}


