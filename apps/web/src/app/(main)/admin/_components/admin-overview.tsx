"use client";

import { useEffect, useState, useCallback } from "react";
import { StatCard, SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import styles from "../admin.module.css";

interface SystemStatus {
  activeTraders: number;
  totalConfigs: number;
  disabled: number;
  sandbox: number;
}

export function AdminOverview() {
  const [tradingStatus, setTradingStatus] = useState<SystemStatus | null>(null);
  const [instrumentsCount, setInstrumentsCount] = useState(0);
  const [modelsCount, setModelsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, instrumentsRes, modelsRes] = await Promise.all([
        fetch("/api/admin/trading/status"),
        fetch("/api/admin/instruments?limit=1"),
        fetch("/api/admin/training/models"),
      ]);

      if (statusRes.ok) setTradingStatus(await statusRes.json());
      if (instrumentsRes.ok) {
        const data = await instrumentsRes.json();
        setInstrumentsCount(data.total ?? 0);
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModelsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("Failed to fetch admin status", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/admin/instruments/sync", { method: "POST" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleKillSwitch() {
    if (!confirm("Are you sure? This will disable ALL trading immediately."))
      return;

    const reason = prompt("Reason for kill switch activation:");
    if (!reason) return;

    setKillSwitchActive(true);
    try {
      await fetch("/api/admin/trading/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch {
      setKillSwitchActive(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading system status...</div>;
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
          value={String(tradingStatus?.activeTraders ?? 0)}
          label="Active Traders"
        />
        <StatCard value={String(instrumentsCount)} label="Total Instruments" />
        <StatCard
          value={`${tradingStatus?.totalConfigs ?? 0} / ${tradingStatus?.disabled ?? 0}`}
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
                {tradingStatus?.totalConfigs ?? 0}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Active</span>
              <Badge variant="success">
                {tradingStatus?.activeTraders ?? 0}
              </Badge>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Disabled</span>
              <Badge variant="error">{tradingStatus?.disabled ?? 0}</Badge>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Sandbox</span>
              <Badge variant="warning">{tradingStatus?.sandbox ?? 0}</Badge>
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
                isLoading={syncing}
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
                disabled={killSwitchActive}
              >
                {killSwitchActive ? "Activated" : "Activate"}
              </Button>
            </div>
            <div className={styles.actionRow}>
              <div>
                <p className={styles.actionTitle}>Refresh Data</p>
                <p className={styles.actionDesc}>Reload all status data</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchData}>
                Refresh
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
