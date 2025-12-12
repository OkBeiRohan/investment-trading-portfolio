import InformationPanel from "@/components/auth/layout/information.panel";
import styles from "./auth.module.css";

export default function AuthLayout({
  children,
}: LayoutProps<"/authentication">) {
  return (
    <div className={styles.authRoot}>
      <InformationPanel />
      {children}
    </div>
  );
}
