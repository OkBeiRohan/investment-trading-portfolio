import { Suspense } from "react";
import { QueryHydrator, prefetchQueries } from "@repo/trpc/ssr";
import { AdminOverview } from "./_components/admin-overview";
import styles from "./admin.module.css";

function AdminOverviewSkeleton() {
  return (
    <div className={styles.loading} style={{ flexDirection: "column", gap: "var(--spacing-lg)", padding: "var(--spacing-lg) 0" }}>
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-md)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: 80, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
        ))}
      </div>
      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-lg)" }}>
        <div className="animate-pulse" style={{ height: 200, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
        <div className="animate-pulse" style={{ height: 200, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
      </div>
    </div>
  );
}

const API_URL = process.env.API_URL ?? "";

export default async function AdminPage() {
  const dehydratedState = await prefetchQueries(async (queryClient) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["admin", "trading", "status"],
        queryFn: () =>
          fetch(`${API_URL}/api/admin/trading/status`).then((r) => r.json()),
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "instruments-count"],
        queryFn: () =>
          fetch(`${API_URL}/api/admin/instruments?limit=1`).then((r) =>
            r.json(),
          ),
      }),
      queryClient.prefetchQuery({
        queryKey: ["admin", "models"],
        queryFn: () =>
          fetch(`${API_URL}/api/admin/training/models`).then((r) => r.json()),
      }),
    ]);
  });

  return (
    <QueryHydrator state={dehydratedState}>
      <Suspense fallback={<AdminOverviewSkeleton />}>
        <AdminOverview />
      </Suspense>
    </QueryHydrator>
  );
}
