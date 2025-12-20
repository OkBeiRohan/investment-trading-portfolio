import { Skeleton } from "@/components/loading/skeleton";
import { SkeletonFormGroup } from "../group/skeleton";
import styles from "./input.module.css";

interface SkeletonInputProps {
  label?: boolean;
  icon?: boolean;
}

export function SkeletonInput({
  label = true,
  icon = false,
}: SkeletonInputProps) {
  return (
    <SkeletonFormGroup label={label}>
      <div className={styles.inputWrapper}>
        {icon && (
          <Skeleton
            variant="circular"
            width={20}
            height={20}
            className={styles.iconSkeleton}
          />
        )}
        <div className={styles.input}>
          <Skeleton width="100%" height={16} />
        </div>
      </div>
    </SkeletonFormGroup>
  );
}
