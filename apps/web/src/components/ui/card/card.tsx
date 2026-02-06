import styles from "./card.module.css";
import { CardProps } from "./card.types";

export function Card({
  children,
  variant = "default",
  padding = "default",
  className,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[`variant-${variant}`],
    styles[`padding-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
