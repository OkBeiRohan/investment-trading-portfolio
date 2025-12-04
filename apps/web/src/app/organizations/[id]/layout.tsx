"use client";

import React from "react";
import { OrgSidebar } from "@/components/layouts/Sidebar";
import { useOrganization } from "@/hooks/organization/use-organization";
import { useParams } from "next/navigation";

export default function OrganizationDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params?.id as string;
  // In a real app, we'd fetch the org details here or use the hook context if it persists across layout
  // For now, we'll assume we can get the name or just use a placeholder until data loads
  const { activeOrganization } = useOrganization();

  // If the active organization doesn't match the URL param, we might want to switch or just show data for the URL param.
  // Assuming the layout is purely for navigation structure:

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40">
      <OrgSidebar
        orgId={orgId}
        orgName={activeOrganization?.name || "Organization"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
