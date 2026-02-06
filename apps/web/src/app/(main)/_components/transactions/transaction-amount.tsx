import styles from "./transactions.module.css";
import { TransactionAmountProps } from "./transactions.types";
import { formatCurrency } from "../../_utilities";

export function TransactionAmount({
  amount,
  type: _type,
}: TransactionAmountProps) {
  const isPositive = amount > 0;
  const displayAmount = Math.abs(amount);

  return (
    <span
      className={`${styles.amount} ${isPositive ? styles.positive : styles.negative}`}
    >
      {isPositive ? "+" : "-"}
      {formatCurrency(displayAmount)}
    </span>
  );
}
