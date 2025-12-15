"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, Users, TrendingUp, Activity } from "lucide-react";
import styles from "@/app/organization/[id]/dashboard.module.css";
import { useOrganization } from "@/hooks/auth/use-organization";
import { authClient } from "@/lib/auth/auth-client";

export function OrgDashboard() {
  const params = useParams();
  const { activeOrganizationId, organization, isLoading } = useOrganization();

  useEffect(() => {
    if (params?.id && activeOrganizationId !== params.id) {
      authClient.organization.setActive({
        organizationId: params.id as string,
      });
    }
  }, [params?.id, activeOrganizationId]);

  if (isLoading || activeOrganizationId !== params?.id) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.loader} size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{organization?.name}</h1>
        <p className={styles.subtitle}>Organization Dashboard</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.blueIcon}`}>
              <Users size={24} />
            </div>
            <div>
              <p className={styles.cardLabel}>Members</p>
              <h3 className={styles.cardValue}>
                {/* {activeOrganization?.members?.length || 0} */}
              </h3>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.greenIcon}`}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p className={styles.cardLabel}>Active Strategies</p>
              <h3 className={styles.cardValue}>3</h3>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={`${styles.iconContainer} ${styles.purpleIcon}`}>
              <Activity size={24} />
            </div>
            <div>
              <p className={styles.cardLabel}>Today&apos;s P&L</p>
              <h3 className={`${styles.cardValue} ${styles.positive}`}>
                +₹12,450
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.placeholder}>
        <p>Organization activity and trading metrics will appear here.</p>
      </div>
    </div>
  );
}
