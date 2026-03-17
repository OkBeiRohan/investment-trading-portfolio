import { Suspense } from "react";
import { QueryHydrator, prefetchQueries } from "@repo/trpc/ssr";
import { ExperimentDetail } from "../../_components/experiment-detail";
import styles from "../../admin.module.css";

function ExperimentDetailSkeleton() {
  return (
    <div className={styles.loading} style={{ flexDirection: "column", gap: "var(--spacing-md)", padding: "var(--spacing-lg) 0" }}>
      <div className="animate-pulse" style={{ width: 120, height: 16, background: "var(--color-bg-card)", borderRadius: "var(--radius-md)" }} />
      <div className="animate-pulse" style={{ width: "100%", height: 120, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)" }}>
        <div className="animate-pulse" style={{ height: 160, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
        <div className="animate-pulse" style={{ height: 160, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
      </div>
      <div className="animate-pulse" style={{ width: "100%", height: 180, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
    </div>
  );
}

interface ExperimentDetailPageProps {
  params: Promise<{ id: string }>;
}

const API_URL = process.env.API_URL ?? "";

export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps) {
  const { id } = await params;

  const dehydratedState = await prefetchQueries(async (queryClient) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["admin", "experiments", id],
        queryFn: () =>
          fetch(`${API_URL}/api/admin/training/experiments/${id}`).then((r) =>
            r.json(),
          ),
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "experiments", id, "runs"],
        queryFn: () =>
          fetch(`${API_URL}/api/admin/training/experiments/${id}/runs`).then(
            (r) => r.json(),
          ),
      }),
    ]);
  });

  return (
    <QueryHydrator state={dehydratedState}>
      <Suspense fallback={<ExperimentDetailSkeleton />}>
        <ExperimentDetail experimentId={id} />
      </Suspense>
    </QueryHydrator>
  );
}
