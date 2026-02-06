"use client";

import styles from "./charts.module.css";
import { DonutChartProps } from "./chart.types";

export function DonutChart({
  segments,
  size = 200,
  strokeWidth = 24,
  showLabels = true,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let accumulatedOffset = 0;

  return (
    <div className={styles.donutContainer}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.donutSvg}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, index) => {
          const percentage = segment.value / total;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const rotation = accumulatedOffset * 360 - 90;
          accumulatedOffset += percentage;

          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              className={styles.donutSegment}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {(centerLabel || centerValue) && (
        <div className={styles.donutCenter}>
          {centerValue && (
            <span className={styles.donutCenterValue}>{centerValue}</span>
          )}
          {centerLabel && (
            <span className={styles.donutCenterLabel}>{centerLabel}</span>
          )}
        </div>
      )}

      {/* Legend */}
      {showLabels && (
        <div className={styles.donutLegend}>
          {segments.map((segment, index) => (
            <div key={index} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: segment.color }}
              />
              <span className={styles.legendLabel}>{segment.label}</span>
              <span className={styles.legendValue}>
                {((segment.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
