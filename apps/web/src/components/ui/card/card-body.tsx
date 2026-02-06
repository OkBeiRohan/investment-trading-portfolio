import styles from "./card.module.css";
import { CardBodyProps } from "./card.types";

export function CardBody({ children, className, ...props }: CardBodyProps) {
  const classes = [styles.body, className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
