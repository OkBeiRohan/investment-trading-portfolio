import type { PerformanceDataPoint, PortfolioSummary } from "../../_types";
import styles from "./portfolio-card.module.css";

interface PortfolioCardProps {
  portfolio: PortfolioSummary;
  performance: PerformanceDataPoint[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function PortfolioCard({ portfolio, performance }: PortfolioCardProps) {
  const sparklineWidth = 200;
  const sparklineHeight = 48;
  const values = performance.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const points =
    values.length >= 2
      ? values
          .map((value, index) => {
            const x = (index / (values.length - 1)) * sparklineWidth;
            const y =
              sparklineHeight - ((value - min) / range) * sparklineHeight;
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  const isPositive = portfolio.todayChange >= 0;

  return (
    <div className={styles.card}>
      <span className={styles.label}>Portfolio Value</span>
      <span className={styles.totalValue}>
        {formatCurrency(portfolio.totalValue)}
      </span>
      <span
        className={`${styles.todayChange} ${
          isPositive ? styles.positive : styles.negative
        }`}
      >
        {isPositive ? "+" : ""}
        {formatCurrency(portfolio.todayChange)} ({formatPercent(portfolio.todayChangePercent)})
      </span>
      {points && (
        <svg
          width={sparklineWidth}
          height={sparklineHeight}
          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
          className={styles.sparkline}
        >
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-emerald)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div className={styles.pnlRow}>
        <div className={styles.pnlItem}>
          <span className={styles.pnlLabel}>Realized P&L</span>
          <span
            className={
              portfolio.realizedPnl >= 0 ? styles.pnlPositive : styles.pnlNegative
            }
          >
            {formatCurrency(portfolio.realizedPnl)}
          </span>
        </div>
        <div className={styles.pnlItem}>
          <span className={styles.pnlLabel}>Unrealized P&L</span>
          <span
            className={
              portfolio.unrealizedPnl >= 0
                ? styles.pnlPositive
                : styles.pnlNegative
            }
          >
            {formatCurrency(portfolio.unrealizedPnl)}
          </span>
        </div>
      </div>
    </div>
  );
}
