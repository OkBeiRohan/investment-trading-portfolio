import { SectionCard, StatCard, ListItem } from "../../_components/page-layout";
import { ProgressRing } from "../../_components/charts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
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
        <StatCard value="$299" label="Monthly Cost" />
        <StatCard value="Pro" label="Current Plan" />
        <StatCard value="18/25" label="Seats Used" />
        <StatCard value="Feb 15" label="Next Billing" />
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Current Plan */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Current Plan">
            <Card variant="mint" padding="lg">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-xl)",
                      fontWeight: "var(--font-weight-bold)",
                    }}
                  >
                    Pro Plan
                  </h3>
                  <p
                    style={{
                      margin: "var(--spacing-xs) 0 0",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    25 seats • Unlimited trades • Priority support
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div style={{ marginTop: "var(--spacing-lg)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-3xl)",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                >
                  $299
                  <span
                    style={{
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-normal)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    /mo
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: "var(--spacing-lg)",
                  display: "flex",
                  gap: "var(--spacing-sm)",
                }}
              >
                <Button variant="outline">Change Plan</Button>
                <Button variant="ghost">Cancel</Button>
              </div>
            </Card>
          </SectionCard>
        </div>

        {/* Usage */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Usage This Month">
            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                gap: "var(--spacing-lg)",
              }}
            >
              <ProgressRing
                value={72}
                max={100}
                size={100}
                color="var(--color-chart-1)"
                label="Seats"
              />
              <ProgressRing
                value={45}
                max={100}
                size={100}
                color="var(--color-chart-2)"
                label="API Calls"
              />
              <ProgressRing
                value={28}
                max={100}
                size={100}
                color="var(--color-chart-3)"
                label="Storage"
              />
            </div>
          </SectionCard>
        </div>

        {/* Payment Method */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Payment Method" action="Add New">
            <ListItem
              icon="💳"
              title="Visa ending in 4242"
              subtitle="Expires 12/2025"
              action={
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              }
            />
          </SectionCard>
        </div>

        {/* Billing History */}
        <div style={{ gridColumn: "span 6" }}>
          <SectionCard title="Billing History" action="Download All">
            {[
              { date: "Jan 15, 2024", amount: "$299.00", status: "Paid" },
              { date: "Dec 15, 2023", amount: "$299.00", status: "Paid" },
              { date: "Nov 15, 2023", amount: "$299.00", status: "Paid" },
            ].map((invoice, i) => (
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
                  {invoice.date}
                </span>
                <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                  {invoice.amount}
                </span>
                <Badge variant="success">{invoice.status}</Badge>
              </div>
            ))}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
