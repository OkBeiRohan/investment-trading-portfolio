import { SectionCard, StatCard } from "../../_components/page-layout";

const mockOptions = [
  {
    symbol: "AAPL",
    type: "Call",
    strike: "$185",
    expiry: "Feb 15",
    premium: "$3.45",
    delta: "0.45",
  },
  {
    symbol: "GOOGL",
    type: "Put",
    strike: "$140",
    expiry: "Feb 22",
    premium: "$2.80",
    delta: "-0.32",
  },
  {
    symbol: "TSLA",
    type: "Call",
    strike: "$250",
    expiry: "Mar 01",
    premium: "$8.20",
    delta: "0.58",
  },
  {
    symbol: "MSFT",
    type: "Put",
    strike: "$375",
    expiry: "Feb 29",
    premium: "$4.10",
    delta: "-0.28",
  },
];

export default function OptionsPage() {
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
        <StatCard value="8" label="Open Positions" />
        <StatCard value="$12,450" label="Total Premium" />
        <StatCard
          value="-$2,340"
          label="Unrealized P&L"
          change="-3.2%"
          changeType="negative"
        />
        <StatCard value="45" label="Days to Expiry (Avg)" />
      </div>

      {/* Options Chain */}
      <SectionCard title="Options Positions" action="New Option">
        <table
          style={{
            width: "100%",
            fontSize: "var(--font-size-sm)",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                color: "var(--color-text-secondary)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <th style={{ textAlign: "left", padding: "var(--spacing-sm) 0" }}>
                Symbol
              </th>
              <th style={{ textAlign: "left", padding: "var(--spacing-sm) 0" }}>
                Type
              </th>
              <th
                style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
              >
                Strike
              </th>
              <th
                style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
              >
                Expiry
              </th>
              <th
                style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
              >
                Premium
              </th>
              <th
                style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
              >
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {mockOptions.map((opt, i) => (
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
                  {opt.symbol}
                </td>
                <td
                  style={{
                    padding: "var(--spacing-sm) 0",
                    color:
                      opt.type === "Call"
                        ? "var(--color-success)"
                        : "var(--color-error)",
                  }}
                >
                  {opt.type}
                </td>
                <td
                  style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
                >
                  {opt.strike}
                </td>
                <td
                  style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
                >
                  {opt.expiry}
                </td>
                <td
                  style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
                >
                  {opt.premium}
                </td>
                <td
                  style={{ textAlign: "right", padding: "var(--spacing-sm) 0" }}
                >
                  {opt.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Greeks Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <SectionCard title="Portfolio Greeks">
          {[
            { label: "Delta", value: "+0.42" },
            { label: "Gamma", value: "0.08" },
            { label: "Theta", value: "-$124/day" },
            { label: "Vega", value: "+$340" },
          ].map((greek, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "var(--spacing-sm) 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span style={{ color: "var(--color-text-secondary)" }}>
                {greek.label}
              </span>
              <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                {greek.value}
              </span>
            </div>
          ))}
        </SectionCard>
      </div>
    </>
  );
}
