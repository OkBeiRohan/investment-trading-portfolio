import styles from "./skeleton.module.css";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "rectangular",
  width,
  height,
  className = "",
}: SkeletonProps) {
  const style: React.CSSProperties = {};

  if (width) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }
  if (height) {
    style.height = typeof height === "number" ? `${height}px` : height;
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 1,
  width = "100%",
}: {
  lines?: number;
  width?: string | number;
}) {
  return (
    <div className={styles.skeletonText}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "80%" : width}
        />
      ))}
    </div>
  );
}

export function SkeletonInput({ hasIcon = false }: { hasIcon?: boolean }) {
  return (
    <div className={styles.skeletonInput}>
      <div className={styles.inputWrapper}>
        {hasIcon && <Skeleton variant="circular" width={20} height={20} />}
        <Skeleton variant="text" height={20} className={styles.inputSkeleton} />
      </div>
    </div>
  );
}

export function SkeletonFormGroup({
  hasLabel = true,
  hasIcon = false,
}: {
  hasLabel?: boolean;
  hasIcon?: boolean;
}) {
  return (
    <div className={styles.skeletonFormGroup}>
      {hasLabel && <Skeleton variant="text" width={100} height={14} />}
      <SkeletonInput hasIcon={hasIcon} />
    </div>
  );
}

export function SkeletonButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <Skeleton
      variant="rounded"
      width={fullWidth ? "100%" : 120}
      height={44}
      className={styles.skeletonButton}
    />
  );
}

export function SkeletonSocialButton() {
  return (
    <div className={styles.skeletonSocialButton}>
      <Skeleton variant="circular" width={20} height={20} />
      <Skeleton variant="text" width={80} height={16} />
    </div>
  );
}

export function SkeletonLink() {
  return <Skeleton variant="text" width={120} height={16} />;
}

export function SkeletonDivider() {
  return (
    <div className={styles.skeletonDivider}>
      <div className={styles.line} />
      <Skeleton variant="text" width={140} height={14} />
      <div className={styles.line} />
    </div>
  );
}
