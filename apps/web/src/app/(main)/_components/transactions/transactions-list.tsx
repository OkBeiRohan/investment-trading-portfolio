import styles from "./transactions.module.css";
import { TransactionsListProps } from "./transactions.types";
import { TransactionItem } from "./transaction-item";

export function TransactionsList({
  transactions,
  title = "Recent Transactions",
}: TransactionsListProps) {
  return (
    <div className={styles.transactionsList}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <button className={styles.viewAll} type="button">
          View All
        </button>
      </div>
      <div className={styles.list}>
        {transactions.map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}
