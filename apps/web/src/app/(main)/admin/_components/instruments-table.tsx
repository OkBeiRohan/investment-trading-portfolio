"use client";

import { useState, useMemo } from "react";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAdminInstruments,
  useToggleInstrumentTrading,
  useToggleInstrumentDataCollection,
} from "@/features/admin/hooks/use-admin-queries";
import styles from "../admin.module.css";

export function InstrumentsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [exchange, setExchange] = useState("");
  const [segment, setSegment] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const filters = useMemo(() => {
    const f: Record<string, string> = { page: String(page), limit: "50" };
    if (submittedSearch) f.search = submittedSearch;
    if (exchange) f.exchange = exchange;
    if (segment) f.segment = segment;
    return f;
  }, [page, submittedSearch, exchange, segment]);

  const { data } = useAdminInstruments(filters);

  const toggleTradingMutation = useToggleInstrumentTrading();
  const toggleDataMutation = useToggleInstrumentDataCollection();

  const instruments = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);

  const togglingKey =
    toggleTradingMutation.isPending
      ? (toggleTradingMutation.variables as { instrumentKey: string }).instrumentKey
      : toggleDataMutation.isPending
        ? (toggleDataMutation.variables as { instrumentKey: string }).instrumentKey
        : null;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search);
  }

  return (
    <SectionCard
      title="Instruments"
      action={
        <span className={styles.textMuted}>{total} instruments</span>
      }
    >
      <form className={styles.filterBar} onSubmit={handleSearchSubmit}>
        <input
          className={styles.filterInput}
          placeholder="Search by symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={exchange}
          aria-label="Filter by exchange"
          onChange={(e) => {
            setExchange(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Exchanges</option>
          <option value="NSE">NSE</option>
          <option value="BSE">BSE</option>
          <option value="MCX">MCX</option>
        </select>
        <select
          className={styles.filterSelect}
          value={segment}
          aria-label="Filter by segment"
          onChange={(e) => {
            setSegment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Segments</option>
          <option value="EQ">Equity</option>
          <option value="FO">F&O</option>
          <option value="CD">Currency</option>
          <option value="COM">Commodity</option>
        </select>
        <Button variant="secondary" size="sm" type="submit">
          Search
        </Button>
      </form>

      {instruments.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No instruments found</p>
          <p className={styles.emptyDesc}>
            Try adjusting your filters or sync instruments from the overview
            page.
          </p>
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Exchange</th>
                <th>Type</th>
                <th className={styles.textRight}>Lot Size</th>
                <th>Trading</th>
                <th>Data Collection</th>
                <th className={styles.textRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((inst) => (
                <tr key={inst.instrumentKey}>
                  <td className={styles.textBold}>{inst.symbol}</td>
                  <td>
                    <Badge variant="neutral" size="sm">
                      {inst.exchange}
                    </Badge>
                  </td>
                  <td className={styles.textMuted}>
                    {inst.instrumentType ?? "—"}
                  </td>
                  <td className={styles.textRight}>{inst.lotSize ?? "—"}</td>
                  <td>
                    <Badge
                      variant={inst.tradingEnabled ? "success" : "neutral"}
                      size="sm"
                    >
                      {inst.tradingEnabled ? "On" : "Off"}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      variant={
                        inst.dataCollectionEnabled ? "info" : "neutral"
                      }
                      size="sm"
                    >
                      {inst.dataCollectionEnabled ? "On" : "Off"}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.cellActions}>
                      <Button
                        variant={inst.tradingEnabled ? "ghost" : "outline"}
                        size="sm"
                        onClick={() =>
                          toggleTradingMutation.mutate({
                            instrumentKey: inst.instrumentKey,
                            enabled: !inst.tradingEnabled,
                          })
                        }
                        isLoading={togglingKey === inst.instrumentKey}
                      >
                        {inst.tradingEnabled
                          ? "Disable Trade"
                          : "Enable Trade"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleDataMutation.mutate({
                            instrumentKey: inst.instrumentKey,
                            enabled: !inst.dataCollectionEnabled,
                          })
                        }
                        disabled={togglingKey === inst.instrumentKey}
                      >
                        {inst.dataCollectionEnabled
                          ? "Stop Data"
                          : "Collect Data"}
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
                Page {data?.page ?? page} of {totalPages}
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
