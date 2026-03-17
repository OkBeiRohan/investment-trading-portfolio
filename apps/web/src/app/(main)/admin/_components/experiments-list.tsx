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
  metrics?: Record<string, number>;
  createdAt?: string;
}

interface ExperimentsResponse {
  page: number;
  limit: number;
  items: Experiment[];
  total: number;
}

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
  const [data, setData] = useState<ExperimentsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/training/experiments?page=${page}&limit=20`,
      );
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch experiments", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  async function handleCreate() {
    const name = prompt("Experiment name:");
    if (!name) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/training/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: "draft" }),
      });
      if (res.ok) await fetchExperiments();
    } finally {
      setCreating(false);
    }
  }

  if (loading && !data) {
    return <div className={styles.loading}>Loading experiments...</div>;
  }

  const experiments = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / (data?.limit ?? 20));

  return (
    <>
      <SectionCard
        title="Experiments"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            isLoading={creating}
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
              Page {data?.page ?? 1} of {totalPages}
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
