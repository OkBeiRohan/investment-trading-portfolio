"use client";

import type { WatchlistItem } from "../../_types";
import styles from "./watchlist.module.css";

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function buildSparklinePath(points: number[], width: number, height: number): string {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = 1 + i * stepX;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return `${x},${y}`;
  });
  return coords.join(" ");
}

interface WatchlistProps {
  items: WatchlistItem[];
}

export function Watchlist({ items }: WatchlistProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Watchlist</h2>
        <a href="#" className={styles.seeAll}>
          See All
        </a>
      </div>
      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.symbol} className={styles.row}>
            <div>
              <span className={styles.symbol}>{item.symbol}</span>
              <span className={styles.name}>{item.name}</span>
            </div>
            <div className={styles.sparkline}>
              <svg
                width={50}
                height={24}
                viewBox="0 0 50 24"
                preserveAspectRatio="none"
                aria-hidden
              >
                <polyline
                  points={buildSparklinePath(item.sparkline, 50, 24)}
                  fill="none"
                  stroke={item.changePercent >= 0 ? "var(--color-profit)" : "var(--color-loss)"}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className={styles.priceSection}>
              <div className={styles.price}>{formatPrice(item.price)}</div>
              <div
                className={
                  item.changePercent >= 0 ? styles.changePositive : styles.changeNegative
                }
              >
                {formatChange(item.changePercent)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
