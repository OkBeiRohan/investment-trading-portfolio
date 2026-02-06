import { SectionCard, StatCard } from "../../_components/page-layout";
import styles from "./execution.module.css";

export default function ExecutionPage() {
  return (
    <>
      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <StatCard value="$2,847.32" label="Available Balance" />
        <StatCard value="12" label="Open Orders" />
        <StatCard
          value="$1,234.56"
          label="Today's P&L"
          change="+4.2%"
          changeType="positive"
        />
        <StatCard
          value="87%"
          label="Win Rate"
          change="+2.1%"
          changeType="positive"
        />
      </div>

      {/* Main Grid */}
      <div className={styles.executionGrid}>
        {/* Order Form */}
        <div className={styles.orderForm}>
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>Place Order</h3>
            <div className={styles.formTabs}>
              <button className={`${styles.formTabBuy} active`}>Buy</button>
              <button className={styles.formTabSell}>Sell</button>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Symbol</label>
              <input className={styles.formInput} placeholder="AAPL" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Quantity</label>
              <input
                className={styles.formInput}
                type="number"
                placeholder="100"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Price (USD)</label>
              <input
                className={styles.formInput}
                type="number"
                placeholder="Market"
              />
            </div>
            <button
              style={{
                width: "100%",
                padding: "var(--spacing-md)",
                background: "var(--color-success)",
                color: "white",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: "var(--font-weight-semibold)",
                cursor: "pointer",
              }}
            >
              Place Buy Order
            </button>
          </div>
        </div>

        {/* Order Book */}
        <div className={styles.orderBook}>
          <SectionCard title="Order Book" action="Refresh">
            <div className={styles.orderBookHeader}>
              <span>Price</span>
              <span>Size</span>
              <span>Total</span>
            </div>
            {/* Asks */}
            {[
              { price: "182.50", size: "150", total: "27,375" },
              { price: "182.45", size: "200", total: "36,490" },
              { price: "182.40", size: "320", total: "58,368" },
            ].map((row, i) => (
              <div
                key={i}
                className={`${styles.orderBookRow} ${styles.orderBookRowAsk}`}
              >
                <span className={styles.priceAsk}>${row.price}</span>
                <span>{row.size}</span>
                <span>${row.total}</span>
              </div>
            ))}
            <div
              style={{
                padding: "var(--spacing-sm) 0",
                textAlign: "center",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              $182.35
            </div>
            {/* Bids */}
            {[
              { price: "182.30", size: "180", total: "32,814" },
              { price: "182.25", size: "250", total: "45,562" },
              { price: "182.20", size: "400", total: "72,880" },
            ].map((row, i) => (
              <div
                key={i}
                className={`${styles.orderBookRow} ${styles.orderBookRowBid}`}
              >
                <span className={styles.priceBid}>${row.price}</span>
                <span>{row.size}</span>
                <span>${row.total}</span>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* Market Data */}
        <div className={styles.marketData}>
          <SectionCard title="Market Data (AAPL)">
            {[
              { label: "Last Price", value: "$182.35" },
              { label: "24h Change", value: "+2.34%" },
              { label: "24h High", value: "$184.50" },
              { label: "24h Low", value: "$179.20" },
              { label: "Volume", value: "45.2M" },
              { label: "Market Cap", value: "$2.87T" },
            ].map((item, i) => (
              <div key={i} className={styles.marketDataItem}>
                <span className={styles.marketDataLabel}>{item.label}</span>
                <span className={styles.marketDataValue}>{item.value}</span>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* Open Orders */}
        <div className={styles.openOrders}>
          <SectionCard title="Open Orders" action="View All">
            <table style={{ width: "100%", fontSize: "var(--font-size-sm)" }}>
              <thead>
                <tr
                  style={{
                    color: "var(--color-text-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "var(--spacing-sm) 0",
                    }}
                  >
                    Symbol
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "var(--spacing-sm) 0",
                    }}
                  >
                    Side
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "var(--spacing-sm) 0",
                    }}
                  >
                    Quantity
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "var(--spacing-sm) 0",
                    }}
                  >
                    Price
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "var(--spacing-sm) 0",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    symbol: "AAPL",
                    side: "Buy",
                    qty: "100",
                    price: "$180.00",
                    status: "Pending",
                  },
                  {
                    symbol: "GOOGL",
                    side: "Sell",
                    qty: "50",
                    price: "$142.50",
                    status: "Partial",
                  },
                  {
                    symbol: "MSFT",
                    side: "Buy",
                    qty: "75",
                    price: "$378.00",
                    status: "Pending",
                  },
                ].map((order, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td
                      style={{
                        padding: "var(--spacing-sm) 0",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {order.symbol}
                    </td>
                    <td
                      style={{
                        padding: "var(--spacing-sm) 0",
                        color:
                          order.side === "Buy"
                            ? "var(--color-success)"
                            : "var(--color-error)",
                      }}
                    >
                      {order.side}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "var(--spacing-sm) 0",
                      }}
                    >
                      {order.qty}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "var(--spacing-sm) 0",
                      }}
                    >
                      {order.price}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "var(--spacing-sm) 0",
                      }}
                    >
                      {order.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
