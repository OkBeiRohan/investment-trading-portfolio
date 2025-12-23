import { Skeleton } from "@/components/loading/skeleton";
import styles from "./user.module.css";

export default function HeaderUserLoading() {
  return (
    <div className={styles.headerUser}>
      <div className={styles.avatar}>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <div className={styles.userInfo}>
        <Skeleton
          className={styles.userName}
          variant="text"
          width={90}
          height={15}
        />
        <Skeleton
          className={styles.userRole}
          variant="text"
          width={70}
          height={10}
        />
      </div>
    </div>
  );
}
