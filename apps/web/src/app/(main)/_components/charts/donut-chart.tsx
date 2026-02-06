"use client";

import { useMemo } from "react";
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

  // Pre-calculate all segment data to avoid reassignment during render
  const segmentData = useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const percentage = segment.value / total;
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const rotation = offset * 360 - 90;
      offset += percentage;
      return { segment, percentage, strokeDasharray, rotation };
    });
  }, [segments, total, circumference]);

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
        {segmentData.map((data, index) => (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={data.segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={data.strokeDasharray}
            strokeLinecap="round"
            transform={`rotate(${data.rotation} ${size / 2} ${size / 2})`}
            className={styles.donutSegment}
          />
        ))}
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
          {segmentData.map((data, index) => (
            <div key={index} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: data.segment.color }}
              />
              <span className={styles.legendLabel}>{data.segment.label}</span>
              <span className={styles.legendValue}>
                {(data.percentage * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
