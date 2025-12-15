"use client";

import React from "react";
import { OrgSidebar } from "@/components/layouts/Sidebar";
import { useParams } from "next/navigation";
import styles from "@/app/layout.module.css";
import { useOrganization } from "@/hooks/auth/use-organization";

export default function OrganizationDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params?.id as string;
  const { organization } = useOrganization();

  return (
    <div className={styles.container}>
      <OrgSidebar
        orgId={orgId}
        orgName={organization?.name || "Organization"}
      />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

