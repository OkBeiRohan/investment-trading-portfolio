import { SectionCard, StatCard, ListItem } from "../../_components/page-layout";
import { ProgressRing } from "../../_components/charts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LegacyPage() {
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
        <StatCard value="$1.24M" label="Estate Value" />
        <StatCard value="3" label="Beneficiaries" />
        <StatCard value="85%" label="Planning Complete" />
        <StatCard value="2024" label="Last Updated" />
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Estate Planning Progress */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Planning Progress">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-lg)",
                padding: "var(--spacing-md)",
              }}
            >
              <ProgressRing
                value={85}
                max={100}
                size={140}
                color="var(--color-primary)"
                label="Complete"
              />
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  3 of 4 documents completed
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Documents */}
        <div style={{ gridColumn: "span 8" }}>
          <SectionCard title="Estate Documents" action="Upload">
            {[
              {
                name: "Last Will & Testament",
                status: "Complete",
                date: "Jan 15, 2024",
                icon: "📜",
              },
              {
                name: "Living Trust",
                status: "Complete",
                date: "Jan 15, 2024",
                icon: "📋",
              },
              {
                name: "Power of Attorney",
                status: "Complete",
                date: "Jan 15, 2024",
                icon: "⚖️",
              },
              {
                name: "Healthcare Directive",
                status: "Pending",
                date: "—",
                icon: "🏥",
              },
            ].map((doc, i) => (
              <ListItem
                key={i}
                icon={doc.icon}
                title={doc.name}
                subtitle={doc.date}
                action={
                  <span
                    style={{
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-medium)",
                      background:
                        doc.status === "Complete"
                          ? "var(--color-success-bg)"
                          : "var(--color-warning-bg)",
                      color:
                        doc.status === "Complete"
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                    }}
                  >
                    {doc.status}
                  </span>
                }
              />
            ))}
          </SectionCard>
        </div>

        {/* Beneficiaries */}
        <div style={{ gridColumn: "span 12" }}>
          <SectionCard title="Beneficiaries" action="Add Beneficiary">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "var(--spacing-md)",
              }}
            >
              {[
                {
                  name: "Sarah Johnson",
                  relation: "Spouse",
                  allocation: "60%",
                  avatar: "👩",
                },
                {
                  name: "Michael Johnson",
                  relation: "Son",
                  allocation: "20%",
                  avatar: "👦",
                },
                {
                  name: "Emily Johnson",
                  relation: "Daughter",
                  allocation: "20%",
                  avatar: "👧",
                },
              ].map((ben, i) => (
                <Card key={i} variant="default" padding="default">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-md)",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "var(--color-bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      {ben.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-md)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {ben.name}
                      </h4>
                      <span
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {ben.relation}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "var(--font-size-lg)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {ben.allocation}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Allocation
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
