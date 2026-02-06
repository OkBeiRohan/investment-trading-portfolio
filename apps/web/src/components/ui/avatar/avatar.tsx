import styles from "./avatar.module.css";
import { AvatarProps } from "./avatar.types";
import { getInitials } from "./get-initials";

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  fallback,
  className,
  ...props
}: AvatarProps) {
  const classes = [styles.avatar, styles[`size-${size}`], className]
    .filter(Boolean)
    .join(" ");

  const initials = name ? getInitials(name) : "";

  return (
    <div className={classes} {...props}>
      {src ? (
        <img src={src} alt={alt || name || "Avatar"} className={styles.image} />
      ) : fallback ? (
        <span className={styles.fallback}>{fallback}</span>
      ) : (
        <span className={styles.initials}>{initials}</span>
      )}
    </div>
  );
}
