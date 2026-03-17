"use client";

import { useState } from "react";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdminUsers,
  useEnableUserTrading,
  useDisableUserTrading,
} from "@/features/admin/hooks/use-admin-queries";
import styles from "../admin.module.css";

export function UsersTable() {
  const [page, setPage] = useState(1);
  const { data } = useAdminUsers(page);

  const enableMutation = useEnableUserTrading();
  const disableMutation = useDisableUserTrading();

  const users = data.items;
  const totalPages = Math.ceil(data.total / data.limit);

  function toggleTrading(userId: string, enable: boolean) {
    if (enable) {
      enableMutation.mutate(userId);
    } else {
      disableMutation.mutate(userId);
    }
  }

  const togglingUser =
    enableMutation.isPending
      ? (enableMutation.variables as string)
      : disableMutation.isPending
        ? (disableMutation.variables as string)
        : null;

  return (
    <SectionCard
      title="Trading Users"
      action={
        <span className={styles.textMuted}>{data.total} total users</span>
      }
    >
      {users.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No users found</p>
          <p className={styles.emptyDesc}>
            Users will appear here once they configure their trading settings.
          </p>
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Trading</th>
                <th>Sandbox</th>
                <th>Last Re-Auth</th>
                <th className={styles.textRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td className={styles.textBold}>
                    {user.name || user.userId}
                  </td>
                  <td className={styles.textMuted}>{user.email || "—"}</td>
                  <td>
                    <Badge
                      variant={user.tradingEnabled ? "success" : "neutral"}
                      size="sm"
                    >
                      {user.tradingEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </td>
                  <td>
                    {user.sandboxMode ? (
                      <Badge variant="warning" size="sm">
                        Sandbox
                      </Badge>
                    ) : (
                      <Badge variant="info" size="sm">
                        Live
                      </Badge>
                    )}
                  </td>
                  <td className={styles.textMuted}>
                    {user.lastReAuth
                      ? new Date(user.lastReAuth).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td>
                    <div className={styles.cellActions}>
                      <Button
                        variant={user.tradingEnabled ? "danger" : "primary"}
                        size="sm"
                        onClick={() =>
                          toggleTrading(user.userId, !user.tradingEnabled)
                        }
                        isLoading={togglingUser === user.userId}
                      >
                        {user.tradingEnabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        </>
      )}
    </SectionCard>
  );
}
