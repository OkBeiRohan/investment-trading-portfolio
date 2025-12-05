"use client";

import { useEffect } from "react";
import { useOrganization } from "@/hooks/organization/use-organization";
import { useParams } from "next/navigation";
import { Loader2, Users, TrendingUp, Activity } from "lucide-react";
import styles from "@/app/(dashboard)/organizations/[id]/dashboard.module.css";

export function OrgDashboard() {
  const params = useParams();
  const { activeOrganization, switchOrganization, isLoading } = useOrganization();

  useEffect(() => {
    if (params?.id && activeOrganization?.id !== params.id) {
      switchOrganization(params.id as string);
    }
  }, [params?.id, activeOrganization?.id, switchOrganization]);

  if (isLoading || activeOrganization?.id !== params?.id) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.loader} size={32} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{activeOrganization?.name}</h1>
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
                {activeOrganization?.members?.length || 0}
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
              <p className={styles.cardLabel}>Today's P&L</p>
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
