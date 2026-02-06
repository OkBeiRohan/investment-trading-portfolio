import { SectionCard, StatCard } from "../../_components/page-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mockTeams = [
  { name: "Trading", members: 8, lead: "John Smith", icon: "📈" },
  { name: "Risk Management", members: 4, lead: "Sarah Johnson", icon: "🛡️" },
  { name: "Analytics", members: 6, lead: "Michael Chen", icon: "📊" },
  { name: "Operations", members: 5, lead: "Emily Davis", icon: "⚙️" },
  { name: "Compliance", members: 3, lead: "David Wilson", icon: "📋" },
];

export default function TeamsPage() {
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
        <StatCard value="5" label="Total Teams" />
        <StatCard value="26" label="Team Members" />
        <StatCard value="5" label="Team Leads" />
      </div>

      {/* Teams Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        {mockTeams.map((team, i) => (
          <Card key={i} variant="default" padding="lg">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--spacing-md)",
                marginBottom: "var(--spacing-md)",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-bg-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                {team.icon}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  {team.name}
                </h3>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {team.members} members
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-sm)",
                marginBottom: "var(--spacing-md)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Lead:
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                {team.lead}
              </span>
            </div>

            <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
              <Button variant="outline" size="sm" style={{ flex: 1 }}>
                Manage
              </Button>
              <Button variant="ghost" size="sm" style={{ flex: 1 }}>
                View
              </Button>
            </div>
          </Card>
        ))}

        {/* Add Team Card */}
        <Card
          variant="default"
          padding="lg"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed var(--color-border)",
            cursor: "pointer",
            minHeight: "180px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "32px", marginBottom: "var(--spacing-sm)" }}
            >
              ➕
            </div>
            <span style={{ color: "var(--color-text-secondary)" }}>
              Create New Team
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
