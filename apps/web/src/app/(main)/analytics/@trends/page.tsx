import styles from "../analytics.module.css";
import { BarChart } from "../../_components/charts";

const mockTrendsData = [
  { label: "Mon", value: 3200, color: "var(--color-chart-1)" },
  { label: "Tue", value: 4500, color: "var(--color-chart-1)" },
  { label: "Wed", value: 3800, color: "var(--color-chart-1)" },
  { label: "Thu", value: 5200, color: "var(--color-chart-1)" },
  { label: "Fri", value: 4100, color: "var(--color-chart-1)" },
  { label: "Sat", value: 2800, color: "var(--color-chart-1)" },
  { label: "Sun", value: 3500, color: "var(--color-chart-1)" },
];

export default function TrendsSlot() {
  return (
    <div className={styles.slotCard}>
      <div className={styles.slotCardHeader}>
        <h2 className={styles.slotCardTitle}>Trading Activity</h2>
        <button className={styles.slotCardAction}>View All</button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statItemValue}>27</span>
          <span className={styles.statItemLabel}>Total Trades</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statItemValue}>$27.1K</span>
          <span className={styles.statItemLabel}>Volume</span>
        </div>
      </div>

      <BarChart data={mockTrendsData} height={100} animate />
    </div>
  );
}
