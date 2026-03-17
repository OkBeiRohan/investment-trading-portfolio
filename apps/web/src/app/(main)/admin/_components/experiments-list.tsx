"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import {
  useAdminExperiments,
  useCreateExperiment,
} from "@/features/admin/hooks/use-admin-queries";
import styles from "../admin.module.css";

function statusVariant(status?: string): BadgeVariant {
  switch (status) {
    case "active":
    case "deployed":
      return "success";
    case "training":
    case "running":
      return "info";
    case "failed":
      return "error";
    case "paused":
      return "warning";
    default:
      return "neutral";
  }
}

export function ExperimentsList() {
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({ page: String(page), limit: "20" }),
    [page],
  );

  const { data } = useAdminExperiments(filters);
  const createMutation = useCreateExperiment();

  const experiments = data.items;
  const totalPages = Math.ceil(data.total / data.limit);

  function handleCreate() {
    const name = prompt("Experiment name:");
    if (!name) return;
    createMutation.mutate({ name, status: "draft" });
  }

  return (
    <>
      <SectionCard
        title="Experiments"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            isLoading={createMutation.isPending}
          >
            New Experiment
          </Button>
        }
      >
        {experiments.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No experiments yet</p>
            <p className={styles.emptyDesc}>
              Create your first experiment to start training models.
            </p>
          </div>
        ) : (
          <div className={styles.experimentGrid}>
            {experiments.map((exp) => (
              <Link
                key={exp._id}
                href={`/admin/experiments/${exp._id}`}
                className={styles.experimentCard}
              >
                <div className={styles.experimentCardHeader}>
                  <h3 className={styles.experimentName}>{exp.name}</h3>
                  <Badge variant={statusVariant(exp.status)} size="sm">
                    {exp.status ?? "draft"}
                  </Badge>
                </div>

                {exp.description && (
                  <p className={styles.textMuted}>{exp.description}</p>
                )}

                <div className={styles.experimentMeta}>
                  {exp.tier != null && (
                    <Badge variant="default" size="sm">
                      Tier {exp.tier}
                    </Badge>
                  )}
                  {exp.modelType && (
                    <Badge variant="neutral" size="sm">
                      {exp.modelType}
                    </Badge>
                  )}
                  {exp.createdAt && (
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-secondary)",
                        alignSelf: "center",
                      }}
                    >
                      {new Date(exp.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {exp.metrics && Object.keys(exp.metrics).length > 0 && (
                  <div className={styles.experimentMetrics}>
                    {Object.entries(exp.metrics)
                      .slice(0, 4)
                      .map(([key, val]) => (
                        <div key={key} className={styles.metricItem}>
                          <span className={styles.metricLabel}>{key}</span>
                          <span className={styles.metricValue}>
                            {typeof val === "number" ? val.toFixed(4) : val}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              Page {data.page} of {totalPages}
            </span>
            <div className={styles.paginationButtons}>
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}
