import { Suspense } from "react";
import { QueryHydrator, prefetchQueries } from "@repo/trpc/ssr";
import { ExperimentsList } from "../_components/experiments-list";
import styles from "../admin.module.css";

function ExperimentsListSkeleton() {
  return (
    <div className={styles.loading} style={{ flexDirection: "column", gap: "var(--spacing-md)", padding: "var(--spacing-lg) 0" }}>
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "var(--spacing-md)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: 160, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
        ))}
      </div>
    </div>
  );
}

const API_URL = process.env.API_URL ?? "";

export default async function AdminExperimentsPage() {
  const dehydratedState = await prefetchQueries(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ["admin", "experiments", { page: "1", limit: "20" }],
      queryFn: () =>
        fetch(
          `${API_URL}/api/admin/training/experiments?page=1&limit=20`,
        ).then((r) => r.json()),
    });
  });

  return (
    <QueryHydrator state={dehydratedState}>
      <Suspense fallback={<ExperimentsListSkeleton />}>
        <ExperimentsList />
      </Suspense>
    </QueryHydrator>
  );
}
