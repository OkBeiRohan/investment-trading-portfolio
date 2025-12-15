import styles from "./skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className || ""}`}
      style={style}
    />
  );
}
