import { SectionCard, StatCard, ListItem } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";

const mockAssets = [
  {
    name: "Apple Inc.",
    type: "Stock",
    value: "$124,500",
    shares: "680",
    icon: "📈",
  },
  {
    name: "Tesla Inc.",
    type: "Stock",
    value: "$89,200",
    shares: "120",
    icon: "📈",
  },
  {
    name: "Bitcoin",
    type: "Crypto",
    value: "$45,200",
    shares: "0.85",
    icon: "₿",
  },
  {
    name: "Ethereum",
    type: "Crypto",
    value: "$23,800",
    shares: "12.5",
    icon: "⟠",
  },
  {
    name: "Primary Residence",
    type: "Real Estate",
    value: "$398,000",
    shares: "—",
    icon: "🏠",
  },
  {
    name: "Rental Property",
    type: "Real Estate",
    value: "$285,000",
    shares: "—",
    icon: "🏢",
  },
  {
    name: "401(k)",
    type: "Retirement",
    value: "$89,400",
    shares: "—",
    icon: "👴",
  },
  {
    name: "Roth IRA",
    type: "Retirement",
    value: "$34,600",
    shares: "—",
    icon: "💰",
  },
];

export default function AssetsPage() {
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
        <StatCard value="8" label="Total Assets" />
        <StatCard
          value="$1.09M"
          label="Total Value"
          change="+$42K"
          changeType="positive"
        />
        <StatCard value="5" label="Asset Classes" />
        <StatCard value="+9.2%" label="YTD Return" changeType="positive" />
      </div>

      {/* Assets by Category */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Stocks */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Stocks" action="Add Stock">
            {mockAssets
              .filter((a) => a.type === "Stock")
              .map((asset, i) => (
                <ListItem
                  key={i}
                  icon={asset.icon}
                  title={asset.name}
                  subtitle={`${asset.shares} shares`}
                  action={
                    <span style={{ fontWeight: "var(--font-weight-bold)" }}>
                      {asset.value}
                    </span>
                  }
                />
              ))}
          </SectionCard>
        </div>

        {/* Crypto */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Crypto" action="Add Crypto">
            {mockAssets
              .filter((a) => a.type === "Crypto")
              .map((asset, i) => (
                <ListItem
                  key={i}
                  icon={asset.icon}
                  title={asset.name}
                  subtitle={`${asset.shares} units`}
                  action={
                    <span style={{ fontWeight: "var(--font-weight-bold)" }}>
                      {asset.value}
                    </span>
                  }
                />
              ))}
          </SectionCard>
        </div>

        {/* Real Estate */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Real Estate" action="Add Property">
            {mockAssets
              .filter((a) => a.type === "Real Estate")
              .map((asset, i) => (
                <ListItem
                  key={i}
                  icon={asset.icon}
                  title={asset.name}
                  subtitle="Property"
                  action={
                    <span style={{ fontWeight: "var(--font-weight-bold)" }}>
                      {asset.value}
                    </span>
                  }
                />
              ))}
          </SectionCard>
        </div>

        {/* Retirement */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Retirement Accounts" action="Add Account">
            {mockAssets
              .filter((a) => a.type === "Retirement")
              .map((asset, i) => (
                <ListItem
                  key={i}
                  icon={asset.icon}
                  title={asset.name}
                  subtitle="Retirement"
                  action={
                    <span style={{ fontWeight: "var(--font-weight-bold)" }}>
                      {asset.value}
                    </span>
                  }
                />
              ))}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
