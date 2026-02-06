import styles from "./balance-card.module.css";
import { CurrencyBadgeProps } from "./balance-card.types";

export function CurrencyBadge({ symbol, rate, name }: CurrencyBadgeProps) {
  return (
    <div className={styles.currencyBadge}>
      <span className={styles.currencySymbol}>{symbol}</span>
      <div className={styles.currencyInfo}>
        <span className={styles.currencyName}>{name}</span>
        <span className={styles.currencyRate}>{rate.toFixed(2)}</span>
      </div>
    </div>
  );
}
