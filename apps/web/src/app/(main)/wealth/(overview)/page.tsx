import { Card } from "@/components/ui/card";
import { SectionCard, StatCard } from "../../_components/page-layout";
import { DonutChart, ProgressRing } from "../../_components/charts";

export default function WealthOverviewPage() {
  return (
    <>
      {/* Net Worth Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <StatCard
          value="$1.24M"
          label="Total Net Worth"
          change="+8.4%"
          changeType="positive"
        />
        <StatCard value="$842K" label="Liquid Assets" />
        <StatCard value="$398K" label="Real Estate" />
        <StatCard
          value="$124K"
          label="Retirement"
          change="+12.1%"
          changeType="positive"
        />
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Asset Allocation */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Asset Allocation" action="Rebalance">
            <DonutChart
              segments={[
                { label: "Stocks", value: 35, color: "var(--color-chart-1)" },
                {
                  label: "Real Estate",
                  value: 25,
                  color: "var(--color-chart-2)",
                },
                { label: "Bonds", value: 15, color: "var(--color-chart-3)" },
                { label: "Crypto", value: 10, color: "var(--color-chart-4)" },
                { label: "Cash", value: 15, color: "var(--color-chart-5)" },
              ]}
              size={180}
              strokeWidth={28}
              centerValue="$1.24M"
              centerLabel="Total"
              showLabels
            />
          </SectionCard>
        </div>

        {/* Goals Progress */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Financial Goals" action="Set Goals">
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                flexWrap: "wrap",
                gap: "var(--spacing-lg)",
              }}
            >
              <ProgressRing
                value={75}
                max={100}
                size={100}
                color="var(--color-chart-1)"
                label="Emergency Fund"
              />
              <ProgressRing
                value={42}
                max={100}
                size={100}
                color="var(--color-chart-2)"
                label="Retirement"
              />
              <ProgressRing
                value={88}
                max={100}
                size={100}
                color="var(--color-chart-3)"
                label="House Down"
              />
            </div>
          </SectionCard>
        </div>

        {/* Top Holdings */}
        <div style={{ gridColumn: "span 12" }}>
          <SectionCard title="Top Holdings" action="View All">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "var(--spacing-md)",
              }}
            >
              {[
                {
                  name: "AAPL",
                  type: "Stock",
                  value: "$124,500",
                  change: "+12.4%",
                },
                {
                  name: "Primary Residence",
                  type: "Real Estate",
                  value: "$398,000",
                  change: "+8.2%",
                },
                {
                  name: "401(k)",
                  type: "Retirement",
                  value: "$89,400",
                  change: "+15.3%",
                },
                {
                  name: "BTC",
                  type: "Crypto",
                  value: "$45,200",
                  change: "+24.1%",
                },
              ].map((holding, i) => (
                <Card key={i} variant="default" padding="compact">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-md)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {holding.name}
                      </h4>
                      <span
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {holding.type}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "var(--font-weight-bold)" }}>
                        {holding.value}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-success)",
                        }}
                      >
                        {holding.change}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
