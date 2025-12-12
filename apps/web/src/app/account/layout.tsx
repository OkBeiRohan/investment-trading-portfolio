import { AccountSidebar } from "@/components/layouts/Sidebar";
import styles from "@/app/layout.module.css";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <AccountSidebar />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

