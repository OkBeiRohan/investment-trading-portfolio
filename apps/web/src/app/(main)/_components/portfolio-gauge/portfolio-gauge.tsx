import styles from "./portfolio-gauge.module.css";

interface PortfolioGaugeProps {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  investedValue: number;
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
  return `${sign}${value.toFixed(1)}%`;
}

export function PortfolioGauge({
  totalValue,
  todayChange,
  todayChangePercent,
  investedValue,
}: PortfolioGaugeProps) {
  const returns = totalValue - investedValue;
  const fillPercent = Math.min(todayChangePercent * 5, 100);
  const arcLength = Math.PI * 80;
  const fillLength = (arcLength * fillPercent) / 100;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Total Portfolio Value</h3>
        <a href="#" className={styles.viewLink}>
          View
        </a>
      </div>
      <div className={styles.gaugeWrapper}>
        <svg
          viewBox="0 0 200 120"
          className={styles.gaugeSvg}
          aria-hidden
        >
          <defs>
            <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--gauge-fill-start)" />
              <stop offset="100%" stopColor="var(--gauge-fill-end)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            className={styles.track}
            fill="none"
            strokeWidth={12}
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            className={styles.fill}
            fill="none"
            strokeWidth={12}
            strokeDasharray={`${fillLength} ${arcLength}`}
            strokeLinecap="round"
          />
          <circle cx={20} cy={100} r={3} className={styles.dot} />
          <circle cx={180} cy={100} r={3} className={styles.dot} />
        </svg>
        <div className={styles.valueBlock}>
          <div className={styles.totalValue}>{formatCurrency(totalValue)}</div>
          <div
            className={
              todayChange >= 0 ? styles.changePositive : styles.changeNegative
            }
          >
            {todayChange >= 0 ? "+" : ""}
            {formatCurrency(todayChange)} ({formatPercent(todayChangePercent)})
          </div>
        </div>
      </div>
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Invested</span>
          <span className={styles.statValue}>{formatCurrency(investedValue)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Returns</span>
          <span
            className={
              returns >= 0 ? styles.statPositive : styles.statNegative
            }
          >
            {returns >= 0 ? "+" : ""}
            {formatCurrency(returns)}
          </span>
        </div>
      </div>
    </div>
  );
}
