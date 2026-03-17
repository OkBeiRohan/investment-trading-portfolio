"use client";

import { useState } from "react";
import { StatCard, SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdminTradingStatus,
  useAdminInstrumentsCount,
  useAdminModels,
  useSyncInstruments,
  useKillSwitch,
} from "@/features/admin/hooks/use-admin-queries";
import { useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/features/admin/hooks/use-admin-queries";
import styles from "../admin.module.css";

export function AdminOverview() {
  const { data: tradingStatus } = useAdminTradingStatus();
  const { data: instrumentsData } = useAdminInstrumentsCount();
  const { data: modelsData } = useAdminModels();

  const queryClient = useQueryClient();
  const syncMutation = useSyncInstruments();
  const killSwitchMutation = useKillSwitch();
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  const instrumentsCount = instrumentsData?.total ?? 0;
  const modelsCount = Array.isArray(modelsData) ? modelsData.length : 0;

  function handleSync() {
    syncMutation.mutate();
  }

  function handleKillSwitch() {
    if (!confirm("Are you sure? This will disable ALL trading immediately."))
      return;

    const reason = prompt("Reason for kill switch activation:");
    if (!reason) return;

    setKillSwitchActive(true);
    killSwitchMutation.mutate(reason, {
      onError: () => setKillSwitchActive(false),
    });
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-md)",
        }}
      >
        <StatCard
          value={String(tradingStatus.activeTraders)}
          label="Active Traders"
        />
        <StatCard value={String(instrumentsCount)} label="Total Instruments" />
        <StatCard
          value={`${tradingStatus.totalConfigs} / ${tradingStatus.disabled}`}
          label="Enabled / Disabled"
        />
        <StatCard value={String(modelsCount)} label="Deployed Models" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--spacing-lg)",
        }}
      >
        <SectionCard title="Trading Status">
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Total Configs</span>
              <span className={styles.statusValue}>
                {tradingStatus.totalConfigs}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Active</span>
              <Badge variant="success">{tradingStatus.activeTraders}</Badge>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Disabled</span>
              <Badge variant="error">{tradingStatus.disabled}</Badge>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Sandbox</span>
              <Badge variant="warning">{tradingStatus.sandbox}</Badge>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions">
          <div className={styles.actionsColumn}>
            <div className={styles.actionRow}>
              <div>
                <p className={styles.actionTitle}>Sync Instruments</p>
                <p className={styles.actionDesc}>
                  Trigger a full instrument sync from the market feeder
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSync}
                isLoading={syncMutation.isPending}
              >
                Sync Now
              </Button>
            </div>
            <div className={styles.actionRow}>
              <div>
                <p className={styles.actionTitle}>Kill Switch</p>
                <p className={styles.actionDesc}>
                  Emergency disable all trading across the platform
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleKillSwitch}
                disabled={killSwitchActive || killSwitchMutation.isPending}
              >
                {killSwitchActive ? "Activated" : "Activate"}
              </Button>
            </div>
            <div className={styles.actionRow}>
              <div>
                <p className={styles.actionTitle}>Refresh Data</p>
                <p className={styles.actionDesc}>Reload all status data</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                Refresh
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
