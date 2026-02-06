import styles from "./page-layout.module.css";

interface StatCardProps {
  value: string;
  label: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function StatCard({ value, label, change, changeType = "neutral" }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {change && (
        <span
          className={`${styles.statChange} ${
            changeType === "positive"
              ? styles.statChangePositive
              : changeType === "negative"
                ? styles.statChangeNegative
                : ""
          }`}
        >
          {changeType === "positive" ? "↑" : changeType === "negative" ? "↓" : ""} {change}
        </span>
      )}
    </div>
  );
}
