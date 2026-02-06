import { PropsWithChildren } from "react";
import { PageLayout, TabsNav } from "../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Route } from "next";

const ORG_TABS: {
  label: string;
  href: Route;
}[] = [
  { label: "Overview", href: "/organization" },
  { label: "Members", href: "/organization/members" },
  { label: "Teams", href: "/organization/teams" },
  { label: "Billing", href: "/organization/billing" },
  { label: "Access Control", href: "/organization/access-control" },
];

export default function OrganizationLayout({ children }: PropsWithChildren) {
  return (
    <PageLayout
      title="Organization"
      subtitle="Manage your organization settings and members"
      actions={<Button>Invite Member</Button>}
    >
      <TabsNav tabs={ORG_TABS} />
      {children}
    </PageLayout>
  );
}
