import { Eye } from "lucide-react";
import styles from "./balance-card.module.css";
import { BalanceCardProps } from "./balance-card.types";
import { BalanceDisplay } from "./balance-display";
import { ActionButtons } from "./action-buttons";
import { CurrencyBadge } from "./currency-badge";
import { mockCurrencyRates } from "../../_data/mock";

export function BalanceCard({ balance }: BalanceCardProps) {
  return (
    <div className={styles.balanceCard}>
      <button className={styles.hideIcon} type="button" aria-label="Hide balance">
        <Eye size={20} />
      </button>

      <BalanceDisplay
        amount={balance.amount}
        currency={balance.currency}
        change={balance.change}
      />

      <ActionButtons />

      <div className={styles.currencyBadges}>
        {mockCurrencyRates.map((rate) => (
          <CurrencyBadge
            key={rate.code}
            code={rate.code}
            symbol={rate.symbol}
            rate={rate.rate}
            name={rate.name}
          />
        ))}
      </div>
    </div>
  );
}
