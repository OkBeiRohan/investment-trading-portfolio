import styles from "../analytics.module.css";
import { ProgressRing, DotMatrix } from "../../_components/charts";

export default function GoalsSlot() {
  return (
    <div className={styles.slotCard}>
      <div className={styles.slotCardHeader}>
        <h2 className={styles.slotCardTitle}>Investment Goals</h2>
        <button className={styles.slotCardAction}>Set Goals</button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          gap: "var(--spacing-lg)",
          flexWrap: "wrap",
        }}
      >
        <ProgressRing
          value={75}
          max={100}
          size={100}
          strokeWidth={10}
          color="var(--color-chart-2)"
          label="Savings"
        />

        <ProgressRing
          value={42}
          max={100}
          size={100}
          strokeWidth={10}
          color="var(--color-chart-3)"
          label="Retirement"
        />

        <DotMatrix
          rows={4}
          cols={10}
          filledDots={28}
          color="var(--color-chart-4)"
          label="Monthly Target"
        />
      </div>
    </div>
  );
}
