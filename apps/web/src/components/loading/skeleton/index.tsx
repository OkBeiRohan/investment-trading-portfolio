import styles from "./skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
  style = {},
}: SkeletonProps) {
  const style_: React.CSSProperties = {};
  if (width) style_.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style_.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className || ""}`}
      style={{ ...style_, ...style }}
    />
  );
}
