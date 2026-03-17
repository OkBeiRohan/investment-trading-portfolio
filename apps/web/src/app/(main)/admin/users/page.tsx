import { Suspense } from "react";
import { QueryHydrator, prefetchQueries } from "@repo/trpc/ssr";
import { UsersTable } from "../_components/users-table";
import styles from "../admin.module.css";

function UsersTableSkeleton() {
  return (
    <div className={styles.loading} style={{ flexDirection: "column", gap: "var(--spacing-md)", padding: "var(--spacing-lg) 0" }}>
      <div className="animate-pulse" style={{ width: "100%", height: 48, background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)" }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{ width: "100%", height: 40, background: "var(--color-bg-card)", borderRadius: "var(--radius-md)" }} />
      ))}
    </div>
  );
}

const API_URL = process.env.API_URL ?? "";

export default async function AdminUsersPage() {
  const dehydratedState = await prefetchQueries(async (queryClient) => {
    await queryClient.prefetchQuery({
      queryKey: ["admin", "trading", "users", 1],
      queryFn: () =>
        fetch(`${API_URL}/api/admin/trading/users?page=1&limit=20`).then((r) =>
          r.json(),
        ),
    });
  });

  return (
    <QueryHydrator state={dehydratedState}>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable />
      </Suspense>
    </QueryHydrator>
  );
}
