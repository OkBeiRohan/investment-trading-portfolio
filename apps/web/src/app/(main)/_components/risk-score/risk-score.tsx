"use client";

import type { RiskMetrics } from "../../_types";
import styles from "./risk-score.module.css";

const getRiskDescription = (score: number) => {
  if (score <= 33) return "Low Risk";
  if (score <= 66) return "Medium Risk";
  return "High Risk";
};

interface RiskScoreProps {
  risk: RiskMetrics;
}

const SEMICIRCLE_R = 12;
const SEMICIRCLE_LENGTH = Math.PI * SEMICIRCLE_R;
const SEMICIRCLE_W = SEMICIRCLE_R * 2 + 12;
const SEMICIRCLE_H = SEMICIRCLE_R * 2 + 4;

function SemicircleProgress({ value }: { value: number }) {
  const dash = (value / 100) * SEMICIRCLE_LENGTH;
  return (
    <svg
      width={SEMICIRCLE_W}
      height={SEMICIRCLE_H}
      viewBox={`0 0 ${SEMICIRCLE_W} ${SEMICIRCLE_H}`}
      className={styles.semicircleSvg}
    >
      <path
        d={`M 4 ${SEMICIRCLE_R + 2} A ${SEMICIRCLE_R} ${SEMICIRCLE_R} 0 0 1 ${SEMICIRCLE_R * 2 + 4} ${SEMICIRCLE_R + 2}`}
        fill="none"
        stroke="var(--color-bg-tertiary)"
        strokeWidth="4"
      />
      <path
        d={`M 4 ${SEMICIRCLE_R + 2} A ${SEMICIRCLE_R} ${SEMICIRCLE_R} 0 0 1 ${SEMICIRCLE_R * 2 + 4} ${SEMICIRCLE_R + 2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray={`${dash} ${SEMICIRCLE_LENGTH}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RiskScore({ risk }: RiskScoreProps) {
  const description = getRiskDescription(risk.overallScore);
  const rows = [
    { label: "High", pct: risk.highRiskPercent, color: "var(--color-coral)" },
    { label: "Medium", pct: risk.mediumRiskPercent, color: "var(--color-amber)" },
    { label: "Low", pct: risk.lowRiskPercent, color: "var(--color-emerald)" },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Portfolio Risk Score</h2>
        <span className={styles.updated}>Updated Just Now</span>
      </div>
      <div className={styles.barWrapper}>
        <div className={styles.bar} />
        <div
          className={styles.marker}
          style={{ left: `${risk.overallScore}%` }}
        />
      </div>
      <div className={styles.scoreSection}>
        <span className={styles.scoreValue}>{risk.overallScore}</span>
        <span className={styles.scoreDescription}>{description}</span>
      </div>
      <div className={styles.rows}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <span
              className={styles.rowDot}
              style={{ backgroundColor: row.color }}
            />
            <span className={styles.rowLabel}>{row.label} Risk</span>
            <span className={styles.rowPct}>{row.pct.toFixed(0)}%</span>
            <div className={styles.rowProgress} style={{ color: row.color }}>
              <SemicircleProgress value={row.pct} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
