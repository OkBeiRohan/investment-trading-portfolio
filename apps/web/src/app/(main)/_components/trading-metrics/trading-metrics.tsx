import type { TradingMetric } from "../../_types";
import styles from "./trading-metrics.module.css";

export function TradingMetrics({ metrics }: { metrics: TradingMetric[] }) {
  return (
    <div className={styles.list}>
      {metrics.map((metric) => (
        <div key={metric.label} className={styles.metric}>
          <span className={styles.label}>{metric.label}</span>
          <span className={styles.value}>{metric.value}</span>
          {metric.description && (
            <span className={styles.description}>{metric.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}
