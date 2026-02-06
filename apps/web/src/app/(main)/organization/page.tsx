import { SectionCard, StatCard, ListItem } from "../_components/page-layout";
import { DonutChart, ProgressRing } from "../_components/charts";

export default function OrganizationOverviewPage() {
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
          value="24"
          label="Total Members"
          change="+3"
          changeType="positive"
        />
        <StatCard value="5" label="Teams" />
        <StatCard value="Pro" label="Current Plan" />
        <StatCard value="99.9%" label="Uptime" />
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--spacing-lg)",
        }}
      >
        {/* Plan Usage */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Plan Usage">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--spacing-md)",
              }}
            >
              <ProgressRing
                value={72}
                max={100}
                size={120}
                color="var(--color-primary)"
                label="Seats Used"
              />
              <div
                style={{
                  textAlign: "center",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                18 of 25 seats used
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Role Distribution */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Role Distribution">
            <DonutChart
              segments={[
                { label: "Admin", value: 3, color: "var(--color-chart-1)" },
                { label: "Manager", value: 5, color: "var(--color-chart-2)" },
                { label: "Member", value: 16, color: "var(--color-chart-3)" },
              ]}
              size={120}
              strokeWidth={16}
              centerValue="24"
              centerLabel="Total"
            />
          </SectionCard>
        </div>

        {/* Quick Stats */}
        <div style={{ gridColumn: "span 4" }}>
          <SectionCard title="Activity (7d)">
            {[
              { label: "Active Users", value: "21" },
              { label: "API Calls", value: "12.4K" },
              { label: "Trades Executed", value: "847" },
              { label: "Reports Generated", value: "23" },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "var(--spacing-sm) 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {stat.label}
                </span>
                <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </SectionCard>
        </div>

        {/* Recent Activity */}
        <div style={{ gridColumn: "span 12" }}>
          <SectionCard title="Recent Activity" action="View All">
            {[
              {
                user: "John Smith",
                action: "invited Sarah Johnson",
                time: "2 hours ago",
                icon: "📧",
              },
              {
                user: "Emily Chen",
                action: "created team 'Analytics'",
                time: "5 hours ago",
                icon: "👥",
              },
              {
                user: "Michael Lee",
                action: "updated billing info",
                time: "1 day ago",
                icon: "💳",
              },
              {
                user: "Sarah Johnson",
                action: "joined the organization",
                time: "2 days ago",
                icon: "✅",
              },
            ].map((activity, i) => (
              <ListItem
                key={i}
                icon={activity.icon}
                title={`${activity.user} ${activity.action}`}
                subtitle={activity.time}
              />
            ))}
          </SectionCard>
        </div>
      </div>
    </>
  );
}
