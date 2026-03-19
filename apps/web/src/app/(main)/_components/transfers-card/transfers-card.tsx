import { ArrowUpDown, ArrowUpRight, Clock } from "lucide-react";
import type { TransferItem } from "../../_types";
import styles from "./transfers-card.module.css";

interface TransfersCardProps {
  transfers: TransferItem[];
}

const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatAmount(amount: number): string {
  const formatted = CURRENCY_FORMAT.format(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function TransfersCard({ transfers }: TransfersCardProps) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ArrowUpDown size={18} aria-hidden />
          <h2 className={styles.cardTitle}>Transfers</h2>
        </div>
        <button type="button" className={styles.expandBtn} aria-label="View all transfers">
          <ArrowUpRight size={18} aria-hidden />
        </button>
      </header>

      <div className={styles.list}>
        {transfers.map((item) => (
          <div key={item.id} className={styles.row}>
            <div className={styles.iconContainer}>
              <Clock size={18} aria-hidden />
            </div>
            <div className={styles.content}>
              <div className={styles.title}>{item.title}</div>
              <div className={styles.subtitle}>{item.subtitle}</div>
            </div>
            <span
              className={`${styles.amount} ${
                item.amount >= 0 ? styles.amountPositive : styles.amountNegative
              }`}
            >
              {formatAmount(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
