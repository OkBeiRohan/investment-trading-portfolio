import { ReactNode } from "react";
import styles from "./page-layout.module.css";

interface ListItemProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function ListItem({ icon, title, subtitle, action }: ListItemProps) {
  return (
    <div className={styles.listItem}>
      {icon && <div className={styles.listItemIcon}>{icon}</div>}
      <div className={styles.listItemContent}>
        <h3 className={styles.listItemTitle}>{title}</h3>
        {subtitle && <p className={styles.listItemSubtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.listItemAction}>{action}</div>}
    </div>
  );
}
