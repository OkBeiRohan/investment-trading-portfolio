"use client";

import styles from "./charts.module.css";
import { ProgressRingProps } from "./chart.types";

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = "var(--color-primary)",
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - percentage);

  return (
    <div className={styles.progressRingContainer}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.progressRingSvg}
      >
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={styles.progressRingValue}
        />
      </svg>

      <div className={styles.progressRingCenter}>
        <span className={styles.progressRingPercent}>
          {Math.round(percentage * 100)}%
        </span>
        {label && <span className={styles.progressRingLabel}>{label}</span>}
      </div>
    </div>
  );
}
