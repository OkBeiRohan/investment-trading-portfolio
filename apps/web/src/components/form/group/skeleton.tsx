import { Skeleton } from "@/components/loading/skeleton";
import styles from "./formGroup.module.css";
import { PropsWithChildren } from "react";

interface SkeletonFormGroupProps extends PropsWithChildren {
  label?: boolean;
}

export function SkeletonFormGroup({
  label = true,
  children,
}: SkeletonFormGroupProps) {
  return (
    <div className={styles.formGroup}>
      {label && <Skeleton width={80} height={14} />}
      {children}
    </div>
  );
}
