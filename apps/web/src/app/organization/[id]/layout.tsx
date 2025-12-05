"use client";

import React from "react";
import { OrgSidebar } from "@/components/layouts/Sidebar";
import { useOrganization } from "@/hooks/organization/use-organization";
import { useParams } from "next/navigation";
import styles from "@/app/layout.module.css";

export default function OrganizationDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params?.id as string;
  const { activeOrganization } = useOrganization();

  return (
    <div className={styles.container}>
      <OrgSidebar
        orgId={orgId}
        orgName={activeOrganization?.name || "Organization"}
      />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

