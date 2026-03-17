import { TrendingDown, TrendingUp } from "lucide-react";
import type { StatMetric } from "../../_types";
import styles from "./stats-grid.module.css";

interface StatsGridProps {
  stats: StatMetric[];
}

const accentClassMap: Record<StatMetric["color"], string> = {
  emerald: styles.accentEmerald ?? "",
  coral: styles.accentCoral ?? "",
  amber: styles.accentAmber ?? "",
  sky: styles.accentSky ?? "",
  violet: styles.accentViolet ?? "",
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className={styles.grid}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${styles.card} ${accentClassMap[stat.color]}`}
        >
          <span className={styles.label}>{stat.label}</span>
          <span className={styles.value}>{stat.value}</span>
          {stat.change !== undefined && (
            <span
              className={`${styles.change} ${
                stat.change >= 0 ? styles.changePositive : styles.changeNegative
              }`}
            >
              {stat.change >= 0 ? (
                <TrendingUp size={14} aria-hidden />
              ) : (
                <TrendingDown size={14} aria-hidden />
              )}
              {stat.changeLabel ?? `${stat.change >= 0 ? "+" : ""}${stat.change.toFixed(1)}%`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
