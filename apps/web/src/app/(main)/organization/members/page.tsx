import { SectionCard, StatCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockMembers = [
  {
    name: "John Smith",
    email: "john@company.com",
    role: "Admin",
    status: "active",
    avatar: "👨‍💼",
  },
  {
    name: "Sarah Johnson",
    email: "sarah@company.com",
    role: "Manager",
    status: "active",
    avatar: "👩‍💼",
  },
  {
    name: "Michael Chen",
    email: "michael@company.com",
    role: "Member",
    status: "active",
    avatar: "👨‍💻",
  },
  {
    name: "Emily Davis",
    email: "emily@company.com",
    role: "Member",
    status: "active",
    avatar: "👩‍💻",
  },
  {
    name: "David Wilson",
    email: "david@company.com",
    role: "Member",
    status: "pending",
    avatar: "👤",
  },
  {
    name: "Lisa Brown",
    email: "lisa@company.com",
    role: "Manager",
    status: "active",
    avatar: "👩‍🔬",
  },
];

export default function MembersPage() {
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
        <StatCard value="24" label="Total Members" />
        <StatCard value="3" label="Admins" />
        <StatCard value="5" label="Managers" />
        <StatCard value="2" label="Pending Invites" />
      </div>

      {/* Members Table */}
      <SectionCard>
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
              <th style={{ textAlign: "left", padding: "var(--spacing-sm)" }}>
                Member
              </th>
              <th style={{ textAlign: "left", padding: "var(--spacing-sm)" }}>
                Email
              </th>
              <th style={{ textAlign: "left", padding: "var(--spacing-sm)" }}>
                Role
              </th>
              <th style={{ textAlign: "left", padding: "var(--spacing-sm)" }}>
                Status
              </th>
              <th style={{ textAlign: "right", padding: "var(--spacing-sm)" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockMembers.map((member, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <td style={{ padding: "var(--spacing-md) var(--spacing-sm)" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-sm)",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{member.avatar}</span>
                    <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                      {member.name}
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    padding: "var(--spacing-md) var(--spacing-sm)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {member.email}
                </td>
                <td style={{ padding: "var(--spacing-md) var(--spacing-sm)" }}>
                  <Badge
                    variant={
                      member.role === "Admin"
                        ? "info"
                        : member.role === "Manager"
                          ? "warning"
                          : "default"
                    }
                  >
                    {member.role}
                  </Badge>
                </td>
                <td style={{ padding: "var(--spacing-md) var(--spacing-sm)" }}>
                  <Badge
                    variant={member.status === "active" ? "success" : "warning"}
                  >
                    {member.status}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "var(--spacing-md) var(--spacing-sm)",
                    textAlign: "right",
                  }}
                >
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}
