import { SectionCard, StatCard } from "../../_components/page-layout";
import { BarChart, DonutChart, Sparkline } from "../../_components/charts";

export default function TradeAnalyticsPage() {
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
        <StatCard value="234" label="Total Trades (30d)" />
        <StatCard
          value="+$12,847"
          label="Net P&L"
          change="+18.4%"
          changeType="positive"
        />
        <StatCard
          value="68%"
          label="Win Rate"
          change="+5.2%"
          changeType="positive"
        />
        <StatCard value="1.8" label="Profit Factor" />
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* P&L Chart */}
        <div style={{ gridColumn: "span 8" }}>
          <SectionCard title="P&L Over Time">
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkline
                data={[
                  100, 120, 95, 140, 130, 160, 145, 180, 175, 210, 195, 230,
                ]}
                width={600}
                height={180}
                color="var(--color-success)"
                fillOpacity={0.15}
              />
            </div>
          </SectionCard>
        </div>

        {/* Win/Loss Distribution */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Win/Loss Distribution">
            <DonutChart
              segments={[
                { label: "Wins", value: 68, color: "var(--color-success)" },
                { label: "Losses", value: 32, color: "var(--color-error)" },
              ]}
              size={160}
              strokeWidth={24}
              centerValue="68%"
              centerLabel="Win Rate"
            />
          </SectionCard>
        </div>

        {/* Trading by Day */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Trades by Day of Week">
            <BarChart
              data={[
                { label: "Mon", value: 42, color: "var(--color-chart-1)" },
                { label: "Tue", value: 55, color: "var(--color-chart-1)" },
                { label: "Wed", value: 38, color: "var(--color-chart-1)" },
                { label: "Thu", value: 61, color: "var(--color-chart-1)" },
                { label: "Fri", value: 48, color: "var(--color-chart-1)" },
              ]}
              height={120}
              animate
            />
          </SectionCard>
        </div>

        {/* Asset Breakdown */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Trades by Asset Class">
            <DonutChart
              segments={[
                { label: "Stocks", value: 45, color: "var(--color-chart-1)" },
                { label: "Options", value: 30, color: "var(--color-chart-2)" },
                { label: "Crypto", value: 15, color: "var(--color-chart-3)" },
                { label: "ETFs", value: 10, color: "var(--color-chart-4)" },
              ]}
              size={140}
              strokeWidth={20}
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
