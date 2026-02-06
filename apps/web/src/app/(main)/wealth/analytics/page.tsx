import { SectionCard, StatCard } from "../../_components/page-layout";
import { BarChart, DonutChart, Sparkline } from "../../_components/charts";

export default function WealthAnalyticsPage() {
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
        <StatCard
          value="+$124,500"
          label="YTD Growth"
          change="+9.2%"
          changeType="positive"
        />
        <StatCard value="$4,200" label="Monthly Income" />
        <StatCard
          value="$18,500"
          label="Dividends (YTD)"
          change="+12%"
          changeType="positive"
        />
        <StatCard value="3.4%" label="Yield" />
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Net Worth Over Time */}
        <div style={{ gridColumn: "span 8" }}>
          <SectionCard title="Net Worth Over Time">
            <Sparkline
              data={[
                800, 820, 850, 890, 920, 980, 1020, 1080, 1100, 1150, 1200,
                1240,
              ]}
              width={600}
              height={180}
              color="var(--color-primary)"
              fillOpacity={0.15}
            />
          </SectionCard>
        </div>

        {/* Income Sources */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Income Sources">
            <DonutChart
              segments={[
                {
                  label: "Dividends",
                  value: 45,
                  color: "var(--color-chart-1)",
                },
                { label: "Rental", value: 35, color: "var(--color-chart-2)" },
                { label: "Interest", value: 20, color: "var(--color-chart-3)" },
              ]}
              size={140}
              strokeWidth={20}
              centerValue="$4.2K"
              centerLabel="/month"
            />
          </SectionCard>
        </div>

        {/* Monthly Income */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Monthly Passive Income">
            <BarChart
              data={[
                { label: "Jan", value: 3800, color: "var(--color-chart-1)" },
                { label: "Feb", value: 4100, color: "var(--color-chart-1)" },
                { label: "Mar", value: 3900, color: "var(--color-chart-1)" },
                { label: "Apr", value: 4200, color: "var(--color-chart-1)" },
                { label: "May", value: 4500, color: "var(--color-chart-1)" },
                { label: "Jun", value: 4200, color: "var(--color-chart-1)" },
              ]}
              height={120}
              animate
            />
          </SectionCard>
        </div>

        {/* Asset Performance */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Asset Class Performance (YTD)">
            <BarChart
              data={[
                { label: "Crypto", value: 24, color: "var(--color-chart-4)" },
                { label: "Stocks", value: 12, color: "var(--color-chart-1)" },
                {
                  label: "Real Estate",
                  value: 8,
                  color: "var(--color-chart-2)",
                },
                { label: "Bonds", value: 4, color: "var(--color-chart-3)" },
              ]}
              height={120}
              animate
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
