import { PropsWithChildren, ReactNode } from "react";
import styles from "./page-layout.module.css";

interface PageLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
}: PageLayoutProps) {
  return (
    <div className={styles.pageLayout}>
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleSection}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.pageActions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}
