import { SectionCard, StatCard } from "../../_components/page-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockRoles = [
  {
    name: "Admin",
    description: "Full access to all features and settings",
    members: 3,
    permissions: ["All"],
  },
  {
    name: "Manager",
    description: "Manage team members and view reports",
    members: 5,
    permissions: ["View", "Edit", "Manage Team"],
  },
  {
    name: "Trader",
    description: "Execute trades and view analytics",
    members: 12,
    permissions: ["View", "Trade"],
  },
  {
    name: "Viewer",
    description: "Read-only access to reports",
    members: 4,
    permissions: ["View"],
  },
];

export default function AccessControlPage() {
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
        <StatCard value="4" label="Roles Defined" />
        <StatCard value="24" label="Users Assigned" />
        <StatCard value="12" label="Permissions" />
        <StatCard value="2FA" label="Security Level" />
      </div>

      {/* Roles Grid */}
      <SectionCard title="Roles & Permissions" action="Create Role">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--spacing-md)",
          }}
        >
          {mockRoles.map((role, i) => (
            <Card key={i} variant="default" padding="compact">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "var(--spacing-sm)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-md)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  {role.name}
                </h3>
                <Badge
                  variant={
                    role.name === "Admin"
                      ? "error"
                      : role.name === "Manager"
                        ? "warning"
                        : "info"
                  }
                >
                  {role.members} users
                </Badge>
              </div>
              <p
                style={{
                  margin: "0 0 var(--spacing-md)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {role.description}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--spacing-xs)",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                {role.permissions.map((perm, j) => (
                  <span
                    key={j}
                    style={{
                      padding: "var(--spacing-xs) var(--spacing-sm)",
                      background: "var(--color-bg-tertiary)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)",
                    }}
                  >
                    {perm}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" style={{ width: "100%" }}>
                Edit Permissions
              </Button>
            </Card>
          ))}
        </div>
      </SectionCard>

      {/* Security Settings */}
      <SectionCard title="Security Settings">
        {[
          {
            label: "Two-Factor Authentication",
            value: "Required for all users",
            enabled: true,
          },
          { label: "Session Timeout", value: "30 minutes", enabled: true },
          { label: "IP Whitelist", value: "Disabled", enabled: false },
          { label: "Audit Logging", value: "Enabled", enabled: true },
        ].map((setting, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--spacing-md) 0",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div>
              <div style={{ fontWeight: "var(--font-weight-medium)" }}>
                {setting.label}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {setting.value}
              </div>
            </div>
            <Badge variant={setting.enabled ? "success" : "default"}>
              {setting.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        ))}
      </SectionCard>
    </>
  );
}
