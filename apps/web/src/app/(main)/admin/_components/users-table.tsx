"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import styles from "../admin.module.css";

interface TradingUser {
  userId: string;
  name?: string;
  email?: string;
  tradingEnabled: boolean;
  sandboxMode: boolean;
  lastReAuth?: string;
}

interface UsersResponse {
  page: number;
  limit: number;
  items: TradingUser[];
  total: number;
}

export function UsersTable() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/trading/users?page=${page}&limit=20`,
      );
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleTrading(userId: string, enable: boolean) {
    setTogglingUser(userId);
    try {
      const action = enable ? "enable" : "disable";
      await fetch(`/api/admin/trading/users/${userId}/${action}`, {
        method: "POST",
      });
      await fetchUsers();
    } finally {
      setTogglingUser(null);
    }
  }

  if (loading && !data) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  const users = data?.items ?? [];

  return (
    <SectionCard
      title="Trading Users"
      action={
        <span className={styles.textMuted}>
          {data?.total ?? 0} total users
        </span>
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

          {(data?.total ?? 0) > 20 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                Page {data?.page ?? 1} of{" "}
                {Math.ceil((data?.total ?? 0) / (data?.limit ?? 20))}
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
                  disabled={
                    page >= Math.ceil((data?.total ?? 0) / (data?.limit ?? 20))
                  }
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
