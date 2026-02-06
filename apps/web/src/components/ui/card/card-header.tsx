import styles from "./card.module.css";
import { CardHeaderProps } from "./card.types";

export function CardHeader({
  children,
  actions,
  className,
  ...props
}: CardHeaderProps) {
  const classes = [styles.header, className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      <div>{children}</div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  );
}
