import styles from "./balance-card.module.css";
import { BalanceDisplayProps } from "./balance-card.types";
import { formatCurrency } from "../../_utilities";

export function BalanceDisplay({
  amount,
  currency,
  change,
}: BalanceDisplayProps) {
  const isPositive = change >= 0;

  return (
    <div className={styles.balanceDisplay}>
      <div className={styles.currencyLabel}>
        <span>{currency}</span>
        <span className={styles.exchangeInfo}>
          1 {currency} = EUR 0.95= GBP 0.79
        </span>
      </div>
      <div className={styles.amount}>{formatCurrency(amount, currency)}</div>
      <div
        className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}
      >
        {isPositive ? "+" : ""}
        {formatCurrency(change, currency)}
      </div>
    </div>
  );
}
