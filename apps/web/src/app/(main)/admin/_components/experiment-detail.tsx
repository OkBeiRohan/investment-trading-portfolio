"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import styles from "../admin.module.css";

interface Experiment {
  _id: string;
  name: string;
  description?: string;
  tier?: number;
  modelType?: string;
  status?: string;
  deployed?: boolean;
  config?: Record<string, unknown>;
  hyperparameters?: Record<string, unknown>;
  metrics?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

interface TrainingRun {
  _id: string;
  experimentId: string;
  status: string;
  stage?: string;
  startedAt?: string;
  completedAt?: string;
  metrics?: Record<string, number>;
  error?: string;
}

function runStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "running":
    case "training":
      return "info";
    case "failed":
      return "error";
    case "cancelled":
      return "warning";
    case "pending":
      return "neutral";
    default:
      return "neutral";
  }
}

export function ExperimentDetail({
  experimentId,
}: {
  experimentId: string;
}) {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringRun, setTriggeringRun] = useState(false);
  const [cancellingRun, setCancellingRun] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, runsRes] = await Promise.all([
        fetch(`/api/admin/training/experiments/${experimentId}`),
        fetch(`/api/admin/training/experiments/${experimentId}/runs`),
      ]);

      if (expRes.ok) setExperiment(await expRes.json());
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(Array.isArray(runsData) ? runsData : []);
      }
    } catch (err) {
      console.error("Failed to fetch experiment", err);
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleTriggerRun() {
    setTriggeringRun(true);
    try {
      const res = await fetch(
        `/api/admin/training/experiments/${experimentId}/run`,
        { method: "POST" },
      );
      if (res.ok) await fetchData();
    } finally {
      setTriggeringRun(false);
    }
  }

  async function handleCancelRun(runId: string) {
    if (!confirm("Cancel this training run?")) return;

    setCancellingRun(runId);
    try {
      const res = await fetch(
        `/api/admin/training/runs/${runId}/cancel`,
        { method: "POST" },
      );
      if (res.ok) await fetchData();
    } finally {
      setCancellingRun(null);
    }
  }

  async function handleDeploy() {
    if (!confirm("Deploy this model to production?")) return;

    setDeploying(true);
    try {
      const res = await fetch(
        `/api/admin/training/models/${experimentId}/deploy`,
        { method: "POST" },
      );
      if (res.ok) await fetchData();
    } finally {
      setDeploying(false);
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading experiment...</div>;
  }

  if (!experiment) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Experiment not found</p>
        <Link href="/admin/experiments" className={styles.backLink}>
          Back to experiments
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href="/admin/experiments" className={styles.backLink}>
        ← Back to experiments
      </Link>

      <SectionCard
        title={experiment.name}
        action={
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerRun}
              isLoading={triggeringRun}
            >
              Start Run
            </Button>
            {!experiment.deployed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeploy}
                isLoading={deploying}
              >
                Deploy Model
              </Button>
            )}
          </div>
        }
      >
        <div style={{ display: "flex", gap: "var(--spacing-sm)", marginBottom: "var(--spacing-md)" }}>
          <Badge
            variant={
              experiment.status === "active" || experiment.status === "deployed"
                ? "success"
                : "neutral"
            }
          >
            {experiment.status ?? "draft"}
          </Badge>
          {experiment.tier != null && (
            <Badge variant="default">Tier {experiment.tier}</Badge>
          )}
          {experiment.modelType && (
            <Badge variant="neutral">{experiment.modelType}</Badge>
          )}
          {experiment.deployed && (
            <Badge variant="success">Deployed</Badge>
          )}
        </div>

        {experiment.description && (
          <p className={styles.textMuted} style={{ marginBottom: "var(--spacing-md)" }}>
            {experiment.description}
          </p>
        )}
      </SectionCard>

      <div className={styles.detailGrid}>
        <SectionCard title="Configuration">
          {experiment.config &&
          Object.keys(experiment.config).length > 0 ? (
            <div className={styles.detailSection}>
              {Object.entries(experiment.config).map(([key, val]) => (
                <div key={key} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{key}</span>
                  <span className={styles.detailValue}>
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.textMuted}>No configuration set</p>
          )}
        </SectionCard>

        <SectionCard title="Hyperparameters">
          {experiment.hyperparameters &&
          Object.keys(experiment.hyperparameters).length > 0 ? (
            <div className={styles.detailSection}>
              {Object.entries(experiment.hyperparameters).map(
                ([key, val]) => (
                  <div key={key} className={styles.detailRow}>
                    <span className={styles.detailLabel}>{key}</span>
                    <span className={styles.detailValue}>
                      {String(val)}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className={styles.textMuted}>No hyperparameters set</p>
          )}
        </SectionCard>
      </div>

      {experiment.metrics && Object.keys(experiment.metrics).length > 0 && (
        <SectionCard title="Best Metrics">
          <div className={styles.experimentMetrics}>
            {Object.entries(experiment.metrics).map(([key, val]) => (
              <div key={key} className={styles.metricItem}>
                <span className={styles.metricLabel}>{key}</span>
                <span className={styles.metricValue}>
                  {typeof val === "number" ? val.toFixed(6) : val}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Training Runs"
        action={
          <span className={styles.textMuted}>
            {runs.length} run{runs.length !== 1 ? "s" : ""}
          </span>
        }
      >
        {runs.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No training runs</p>
            <p className={styles.emptyDesc}>
              Start a training run to begin model training.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-sm)",
            }}
          >
            {runs.map((run) => (
              <div key={run._id} className={styles.runItem}>
                <div className={styles.runInfo}>
                  <span className={styles.runId}>
                    {run._id.slice(-8)}
                  </span>
                  <span className={styles.runMeta}>
                    {run.stage && `Stage: ${run.stage} · `}
                    {run.startedAt &&
                      `Started: ${new Date(run.startedAt).toLocaleString()}`}
                    {run.completedAt &&
                      ` · Completed: ${new Date(run.completedAt).toLocaleString()}`}
                  </span>
                </div>

                <Badge variant={runStatusVariant(run.status)} size="sm">
                  {run.status}
                </Badge>

                <div className={styles.runActions}>
                  {(run.status === "running" ||
                    run.status === "pending" ||
                    run.status === "training") && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelRun(run._id)}
                      isLoading={cancellingRun === run._id}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
