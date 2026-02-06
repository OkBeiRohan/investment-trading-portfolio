import styles from "./loading.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.dashboardSkeleton}>
      {/* Welcome Skeleton */}
      <div className={styles.dashboardSkeletonWelcome}>
        <div
          className={styles.skeletonTextXl}
          style={{ width: "280px" }}
        />
        <div
          className={styles.skeletonText}
          style={{ width: "180px" }}
        />
      </div>

      {/* Main Grid Skeleton */}
      <div className={styles.dashboardSkeletonMain}>
        {/* Balance Card Skeleton */}
        <div
          className={`${styles.skeletonCard} ${styles.dashboardSkeletonBalance}`}
          style={{ height: "280px" }}
        >
          <div className={styles.skeletonText} style={{ width: "80px" }} />
          <div className={styles.skeletonTextXl} style={{ width: "200px" }} />
          <div className={styles.skeletonRow} style={{ marginTop: "auto" }}>
            <div className={styles.skeletonBox} style={{ width: "80px", height: "40px" }} />
            <div className={styles.skeletonBox} style={{ width: "80px", height: "40px" }} />
            <div className={styles.skeletonBox} style={{ width: "80px", height: "40px" }} />
          </div>
        </div>

        {/* Transactions Skeleton */}
        <div
          className={`${styles.skeletonCard} ${styles.dashboardSkeletonTransactions}`}
          style={{ height: "280px" }}
        >
          <div className={styles.skeletonText} style={{ width: "120px" }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonRow} style={{ alignItems: "center" }}>
              <div className={styles.skeletonCircle} style={{ width: "40px", height: "40px" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <div className={styles.skeletonText} style={{ width: "100px" }} />
                <div className={styles.skeletonTextSm} style={{ width: "60px" }} />
              </div>
              <div className={styles.skeletonText} style={{ width: "60px" }} />
            </div>
          ))}
        </div>

        {/* Chart Skeletons */}
        <div className={styles.dashboardSkeletonCharts}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCard} style={{ height: "200px" }}>
              <div className={styles.skeletonText} style={{ width: "100px" }} />
              <div
                className={styles.skeletonCircle}
                style={{ width: "120px", height: "120px", margin: "auto" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
