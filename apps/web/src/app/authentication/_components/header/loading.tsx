import { Skeleton } from "@/components/loading/skeleton";
import styles from "./header.module.css";

export default function AuthHeaderLoading() {
  return (
    <div className={styles.authHeader}>
      <Skeleton variant="text" width={200} height={35} />
      <Skeleton variant="text" width={300} height={20} />
    </div>
  );
}
