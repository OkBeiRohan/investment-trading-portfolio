import styles from "../analytics.module.css";
import { Sparkline } from "../../_components/charts";

const mockPerformanceData = {
  totalValue: "$124,563.89",
  changePercent: "+12.4%",
  changeIsPositive: true,
  sparklineData: [84, 92, 78, 95, 102, 98, 115, 125, 118, 132, 145, 138],
};

export default function PerformanceSlot() {
  return (
    <div className={styles.slotCard}>
      <div className={styles.slotCardHeader}>
        <h2 className={styles.slotCardTitle}>Portfolio Performance</h2>
        <button className={styles.slotCardAction}>View Details</button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statItemValue}>
            {mockPerformanceData.totalValue}
          </span>
          <span className={styles.statItemLabel}>Total Value</span>
        </div>
        <div className={styles.statItem}>
          <span
            className={`${styles.statItemChange} ${
              mockPerformanceData.changeIsPositive
                ? styles.statItemChangePositive
                : styles.statItemChangeNegative
            }`}
          >
            {mockPerformanceData.changeIsPositive ? "↑" : "↓"}{" "}
            {mockPerformanceData.changePercent}
          </span>
          <span className={styles.statItemLabel}>vs Last Period</span>
        </div>
      </div>

      <div style={{ marginTop: "auto", height: "120px" }}>
        <Sparkline
          data={mockPerformanceData.sparklineData}
          width={600}
          height={120}
          color="var(--color-primary)"
          fillOpacity={0.15}
        />
      </div>
    </div>
  );
}
