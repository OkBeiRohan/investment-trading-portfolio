import { SectionCard, StatCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockStrategies = [
  {
    name: "Momentum Trading",
    type: "Trend Following",
    status: "Active",
    pnl: "+12.4%",
    trades: 45,
  },
  {
    name: "Mean Reversion",
    type: "Statistical",
    status: "Active",
    pnl: "+8.2%",
    trades: 32,
  },
  {
    name: "Breakout Scanner",
    type: "Technical",
    status: "Paused",
    pnl: "+3.1%",
    trades: 18,
  },
  {
    name: "Dividend Harvest",
    type: "Income",
    status: "Active",
    pnl: "+5.6%",
    trades: 12,
  },
];

export default function StrategiesPage() {
  return (
    <>
      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <StatCard value="4" label="Active Strategies" />
        <StatCard
          value="+$8,423"
          label="Total P&L"
          change="+7.3%"
          changeType="positive"
        />
        <StatCard value="107" label="Total Trades" />
        <StatCard value="72%" label="Success Rate" />
      </div>

      {/* Strategies Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {mockStrategies.map((strategy, i) => (
          <Card key={i} variant="default" padding="spacious">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "var(--spacing-md)",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-semibold)",
                    margin: 0,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {strategy.name}
                </h3>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {strategy.type}
                </span>
              </div>
              <span
                style={{
                  padding: "var(--spacing-xs) var(--spacing-sm)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  background:
                    strategy.status === "Active"
                      ? "var(--color-success-bg)"
                      : "var(--color-bg-tertiary)",
                  color:
                    strategy.status === "Active"
                      ? "var(--color-success)"
                      : "var(--color-text-secondary)",
                }}
              >
                {strategy.status}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "var(--spacing-lg)",
                marginBottom: "var(--spacing-md)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-success)",
                  }}
                >
                  {strategy.pnl}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  P&L
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {strategy.trades}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Trades
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <Button variant="outline" size="sm" style={{ flex: 1 }}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" style={{ flex: 1 }}>
                {strategy.status === "Active" ? "Pause" : "Resume"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
