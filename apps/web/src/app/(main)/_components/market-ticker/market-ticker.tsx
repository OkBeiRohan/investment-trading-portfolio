import type { MarketTickerItem } from "../../_types";
import styles from "./market-ticker.module.css";

interface MarketTickerProps {
  items: MarketTickerItem[];
}

export function MarketTicker({ items }: MarketTickerProps) {
  return (
    <div className={styles.ticker} role="region" aria-label="Market prices">
      {items.map((item) => (
        <div key={item.symbol} className={styles.item}>
          <div className={styles.symbol}>{item.symbol}</div>
          <div className={styles.name}>{item.name}</div>
          <div className={styles.price}>
            {item.price.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span
            className={
              item.changePercent >= 0 ? styles.badgePositive : styles.badgeNegative
            }
          >
            {item.changePercent >= 0 ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
