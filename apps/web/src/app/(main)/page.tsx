import styles from "./page.module.css";
import { Welcome } from "@/components/home/welcome";

export default function DashboardPage() {
  return (
    <main className={styles.container}>
      <Welcome />
    </main>
  );
}
