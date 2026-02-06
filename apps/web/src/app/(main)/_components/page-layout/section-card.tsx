import { PropsWithChildren, ReactNode } from "react";
import styles from "./page-layout.module.css";

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  action?: ReactNode;
}

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <div className={styles.sectionCard}>
      {(title || action) && (
        <div className={styles.sectionHeader}>
          {title && <h2 className={styles.sectionTitle}>{title}</h2>}
          {action && <div className={styles.sectionAction}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
