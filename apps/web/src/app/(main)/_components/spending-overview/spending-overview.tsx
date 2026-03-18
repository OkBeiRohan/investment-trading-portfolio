import { ArrowUpRight, Target } from "lucide-react";
import type { SpendingCategory } from "../../_types";
import styles from "./spending-overview.module.css";

interface SpendingOverviewProps {
  totalValue: number;
  weeklyChange: number;
  categories: SpendingCategory[];
}

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return CURRENCY_FORMAT.format(value);
}

function formatChange(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}

export function SpendingOverview({
  totalValue,
  weeklyChange,
  categories,
}: SpendingOverviewProps) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Target size={18} aria-hidden />
          <h2 className={styles.cardTitle}>Spending Overview</h2>
        </div>
        <button
          type="button"
          className={styles.expandBtn}
          aria-label="View spending details"
        >
          <ArrowUpRight size={18} aria-hidden />
        </button>
      </header>

      <div className={styles.spendingHeader}>
        <span className={styles.totalValue}>{formatCurrency(totalValue)}</span>
        <div className={styles.weeklyChange}>
          <span
            className={`${styles.weeklyChangeValue} ${
              weeklyChange < 0 ? styles.weeklyChangeValueNegative : ""
            }`}
          >
            {formatChange(weeklyChange)}
          </span>
          <span className={styles.weeklyChangeLabel}>This week</span>
        </div>
      </div>

      <div className={styles.bar}>
        {categories.map((category, index) => (
          <div
            key={`${category.label}-${index}`}
            className={styles.segment}
            style={{
              flex: category.flex,
              backgroundColor: category.color,
            }}
            role="img"
            aria-label={`${category.label}: ${category.flex} parts`}
          />
        ))}
      </div>

      <div className={styles.legend}>
        {categories.map((category, index) => (
          <div key={`${category.label}-${index}`} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
            <span className={styles.legendLabel}>{category.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
