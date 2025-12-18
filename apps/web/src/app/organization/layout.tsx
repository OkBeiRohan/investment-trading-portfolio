import { MainSidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/header";
import styles from "@/app/layout.module.css";

export default function OrganizationListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <MainSidebar />
      <div className={styles.main}>
        <Header title="Organizations" />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
