import { AccountSidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/header";
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
        <Header title="Account Settings" />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

