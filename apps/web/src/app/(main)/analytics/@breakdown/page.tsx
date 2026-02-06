import styles from "../analytics.module.css";
import { DonutChart } from "../../_components/charts";

const mockBreakdownData = [
  { label: "Stocks", value: 45, color: "var(--color-chart-1)" },
  { label: "Crypto", value: 25, color: "var(--color-chart-2)" },
  { label: "ETFs", value: 20, color: "var(--color-chart-3)" },
  { label: "Bonds", value: 10, color: "var(--color-chart-4)" },
];

export default function BreakdownSlot() {
  return (
    <div className={styles.slotCard}>
      <div className={styles.slotCardHeader}>
        <h2 className={styles.slotCardTitle}>Asset Allocation</h2>
        <button className={styles.slotCardAction}>Rebalance</button>
      </div>

      <DonutChart
        segments={mockBreakdownData}
        size={180}
        strokeWidth={28}
        centerValue="$124K"
        centerLabel="Total"
        showLabels
      />
    </div>
  );
}
