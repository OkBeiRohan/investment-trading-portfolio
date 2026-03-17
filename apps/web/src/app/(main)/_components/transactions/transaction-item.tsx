import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from "lucide-react";
import styles from "./transactions.module.css";
import { TransactionItemProps } from "./transactions.types";

const typeIcons = {
  received: ArrowDownLeft,
  paid: ArrowUpRight,
  transfer: ArrowRightLeft,
};

const avatarStyles = {
  received: styles.avatarReceived,
  paid: styles.avatarPaid,
  transfer: styles.avatarTransfer,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(value));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const Icon = typeIcons[transaction.type];
  const isPositive = transaction.amount > 0;

  return (
    <div className={styles.item}>
      <div className={styles.itemLeft}>
        <div className={`${styles.itemAvatar} ${avatarStyles[transaction.type]}`}>
          <Icon size={16} />
        </div>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{transaction.name}</span>
          <span className={styles.itemMeta}>
            <span className={styles.typeBadge}>{transaction.type}</span>
            {formatDate(transaction.date)}
          </span>
        </div>
      </div>
      <div className={styles.itemRight}>
        <span className={`${styles.amount} ${isPositive ? styles.positive : styles.negative}`}>
          {isPositive ? "+" : "-"}{formatCurrency(transaction.amount)}
        </span>
      </div>
    </div>
  );
}
