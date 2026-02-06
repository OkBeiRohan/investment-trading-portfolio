import styles from "./button.module.css";
import { IconButtonProps } from "./button.types";

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  label,
  className,
  ...props
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    styles[`variant-${variant}`],
    styles[`iconSize-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} aria-label={label} title={label} {...props}>
      {icon}
    </button>
  );
}
