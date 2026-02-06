"use client";

import styles from "./charts.module.css";

interface DotMatrixProps {
  rows?: number;
  cols?: number;
  filledDots: number;
  color?: string;
  label?: string;
}

export function DotMatrix({
  rows = 5,
  cols = 10,
  filledDots,
  color = "var(--color-primary)",
  label,
}: DotMatrixProps) {
  const totalDots = rows * cols;
  const percentage = Math.round((filledDots / totalDots) * 100);

  return (
    <div className={styles.dotMatrixContainer}>
      {label && <span className={styles.dotMatrixLabel}>{label}</span>}
      <div
        className={styles.dotMatrixGrid}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: totalDots }).map((_, index) => (
          <div
            key={index}
            className={styles.dotMatrixDot}
            style={{
              backgroundColor:
                index < filledDots ? color : "var(--color-bg-tertiary)",
            }}
          />
        ))}
      </div>
      <span className={styles.dotMatrixPercent}>{percentage}%</span>
    </div>
  );
}
