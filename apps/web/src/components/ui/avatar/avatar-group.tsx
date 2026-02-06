import { Children, isValidElement, cloneElement } from "react";
import styles from "./avatar.module.css";
import { AvatarGroupProps } from "./avatar.types";

export function AvatarGroup({
  children,
  max = 4,
  className,
  ...props
}: AvatarGroupProps) {
  const classes = [styles.group, className].filter(Boolean).join(" ");

  const childArray = Children.toArray(children).filter(isValidElement);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={classes} {...props}>
      {visibleChildren.map((child, index) =>
        cloneElement(child as React.ReactElement, {
          key: index,
          style: { zIndex: visibleChildren.length - index },
        })
      )}
      {remainingCount > 0 && (
        <div className={styles.overflow}>+{remainingCount}</div>
      )}
    </div>
  );
}
