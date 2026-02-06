import styles from "./card.module.css";
import { CardFooterProps } from "./card.types";

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  const classes = [styles.footer, className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
