import { Clock } from "lucide-react";
import styles from "./transactions.module.css";
import { TransactionItemProps } from "./transactions.types";
import { TransactionAmount } from "./transaction-amount";
import { Avatar } from "@/components/ui/avatar";

export function TransactionItem({ transaction }: TransactionItemProps) {
  const typeLabels = {
    received: "Received",
    paid: "Paid",
    transfer: "Transfer",
  };

  return (
    <div className={styles.item}>
      <div className={styles.itemLeft}>
        <Avatar name={transaction.name} src={transaction.avatar} size="md" />
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{transaction.name}</span>
          <span className={styles.itemType}>
            {typeLabels[transaction.type]}
            <Clock size={12} />
          </span>
        </div>
      </div>
      <TransactionAmount
        amount={transaction.amount}
        type={transaction.type}
      />
    </div>
  );
}
