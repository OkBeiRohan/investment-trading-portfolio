import { Suspense } from "react";
import { QueryHydrator, prefetchQueries } from "@repo/trpc/ssr";
import { InstrumentsTable } from "../_components/instruments-table";
import styles from "../admin.module.css";

function InstrumentsTableSkeleton() {
  return (
    <div className={styles.loading} style={{ flexDirection: "column", gap: "var(--spacing-md)", padding: "var(--spacing-lg) 0" }}>
      <div className="animate-pulse" style={{ width: "100%", height: 48, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{ width: "100%", height: 40, background: "var(--color-bg-card)", borderRadius: "var(--radius-md)" }} />
      ))}
    </div>
  );
}

const API_URL = process.env.API_URL ?? "";

export default async function AdminInstrumentsPage() {
  const dehydratedState = await prefetchQueries(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ["admin", "instruments", { page: "1", limit: "50" }],
      queryFn: () =>
        fetch(`${API_URL}/api/admin/instruments?page=1&limit=50`).then((r) =>
          r.json(),
        ),
    });
  });

  return (
    <QueryHydrator state={dehydratedState}>
      <Suspense fallback={<InstrumentsTableSkeleton />}>
        <InstrumentsTable />
      </Suspense>
    </QueryHydrator>
  );
}
