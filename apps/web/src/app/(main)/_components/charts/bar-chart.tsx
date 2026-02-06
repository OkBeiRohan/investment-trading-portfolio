"use client";

import styles from "./charts.module.css";
import { BarChartProps } from "./chart.types";

export function BarChart({
  data,
  height = 120,
  showLabels = true,
  animate = true,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className={styles.barChartContainer}>
      <div className={styles.barChartBars} style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          const barColor = item.color || "var(--color-primary)";

          return (
            <div key={index} className={styles.barChartColumn}>
              <div
                className={`${styles.barChartBar} ${animate ? styles.barChartBarAnimated : ""}`}
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: barColor,
                  animationDelay: `${index * 50}ms`,
                }}
              />
            </div>
          );
        })}
      </div>

      {showLabels && (
        <div className={styles.barChartLabels}>
          {data.map((item, index) => (
            <span key={index} className={styles.barChartLabel}>
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
