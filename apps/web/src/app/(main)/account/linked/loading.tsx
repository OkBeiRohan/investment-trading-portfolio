import { Skeleton } from "@/components/loading/skeleton";
import styles from "@/features/account/components/linked-accounts-settings.module.css";

export default function LinkedAccountsLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton variant="text" width="200px" height="28px" />
        <Skeleton
          variant="text"
          width="350px"
          height="18px"
          style={{ marginTop: "8px" }}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <Skeleton variant="rounded" width="40px" height="40px" />
          <div style={{ flex: 1 }}>
            <Skeleton variant="text" width="180px" height="22px" />
            <Skeleton
              variant="text"
              width="280px"
              height="16px"
              style={{ marginTop: "4px" }}
            />
          </div>
        </div>

        <div className={styles.accountsList}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.accountItem}>
              <div className={styles.accountInfo}>
                <Skeleton variant="rounded" width="40px" height="40px" />
                <div>
                  <Skeleton variant="text" width="100px" height="18px" />
                  <Skeleton
                    variant="text"
                    width="150px"
                    height="14px"
                    style={{ marginTop: "4px" }}
                  />
                </div>
              </div>
              <Skeleton variant="rounded" width="80px" height="36px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
