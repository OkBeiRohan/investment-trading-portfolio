import styles from "./badge.module.css";
import { BadgeProps } from "./badge.types";

export function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
  className,
  ...props
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
