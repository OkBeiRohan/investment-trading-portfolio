"use client";

import type { AssetAllocation } from "../../_types";
import styles from "./allocation-chart.module.css";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

interface AllocationChartProps {
  allocations: AssetAllocation[];
  totalValue: number;
}

const VIEWBOX = 200;
const CX = 100;
const CY = 100;
const R = 80;
const STROKE_WIDTH = 24;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function AllocationChart({ allocations, totalValue }: AllocationChartProps) {
  let offset = 0;
  const segmentData = allocations.map((a) => {
    const pct = a.percentage / 100;
    const dashLength = pct * CIRCUMFERENCE;
    const strokeDasharray = `${dashLength} ${CIRCUMFERENCE}`;
    const rotation = offset * 360 - 90;
    offset += pct;
    return { ...a, strokeDasharray, rotation };
  });

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Portfolio Allocation</h2>
      <div className={styles.grid}>
        <div className={styles.donutWrapper}>
          <svg
            width={VIEWBOX}
            height={VIEWBOX}
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            className={styles.donutSvg}
          >
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="var(--color-bg-tertiary)"
              strokeWidth={STROKE_WIDTH}
            />
            {segmentData.map((seg, i) => (
              <circle
                key={i}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={seg.strokeDasharray}
                strokeLinecap="round"
                transform={`rotate(${seg.rotation} ${CX} ${CY})`}
                className={styles.segment}
              />
            ))}
          </svg>
          <div className={styles.center}>
            <span className={styles.centerValue}>
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
        <ul className={styles.legend}>
          {allocations.map((a, i) => (
            <li key={i} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: a.color }}
              />
              <span className={styles.legendLabel}>{a.label}</span>
              <span className={styles.legendPct}>{a.percentage.toFixed(0)}%</span>
              <span className={styles.legendValue}>{formatCurrency(a.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
