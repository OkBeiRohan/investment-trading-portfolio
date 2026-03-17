"use client";

import Link from "next/link";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import {
  useAdminExperimentDetail,
  useAdminExperimentRuns,
  useTriggerTrainingRun,
  useCancelTrainingRun,
  useDeployModel,
} from "@/features/admin/hooks/use-admin-queries";
import styles from "../admin.module.css";

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
  const { data: experiment } = useAdminExperimentDetail(experimentId);
  const { data: runs } = useAdminExperimentRuns(experimentId);

  const triggerRunMutation = useTriggerTrainingRun();
  const cancelRunMutation = useCancelTrainingRun();
  const deployMutation = useDeployModel();

  const runsList = Array.isArray(runs) ? runs : [];

  function handleTriggerRun() {
    triggerRunMutation.mutate(experimentId);
  }

  function handleCancelRun(runId: string) {
    if (!confirm("Cancel this training run?")) return;
    cancelRunMutation.mutate({ runId, experimentId });
  }

  function handleDeploy() {
    if (!confirm("Deploy this model to production?")) return;
    deployMutation.mutate(experimentId);
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
              isLoading={triggerRunMutation.isPending}
            >
              Start Run
            </Button>
            {!experiment.deployed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeploy}
                isLoading={deployMutation.isPending}
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
            {runsList.length} run{runsList.length !== 1 ? "s" : ""}
          </span>
        }
      >
        {runsList.length === 0 ? (
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
            {runsList.map((run) => (
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
                      isLoading={
                        cancelRunMutation.isPending &&
                        (cancelRunMutation.variables as { runId: string })?.runId === run._id
                      }
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
