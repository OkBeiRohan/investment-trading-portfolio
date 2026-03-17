"use client";

import { useEffect, useState, useCallback } from "react";
import { SectionCard } from "../../_components/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import styles from "../admin.module.css";

interface Instrument {
  instrumentKey: string;
  symbol: string;
  exchange: string;
  segment?: string;
  instrumentType?: string;
  lotSize?: number;
  tradingEnabled?: boolean;
  dataCollectionEnabled?: boolean;
}

interface InstrumentsResponse {
  page: number;
  limit: number;
  items: Instrument[];
  total: number;
}

export function InstrumentsTable() {
  const [data, setData] = useState<InstrumentsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exchange, setExchange] = useState("");
  const [segment, setSegment] = useState("");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const fetchInstruments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });
      if (search) params.set("search", search);
      if (exchange) params.set("exchange", exchange);
      if (segment) params.set("segment", segment);

      const res = await fetch(`/api/admin/instruments?${params}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to fetch instruments", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, exchange, segment]);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  async function toggleTrading(instrumentKey: string, enabled: boolean) {
    setTogglingKey(instrumentKey);
    try {
      await fetch(`/api/admin/instruments/${instrumentKey}/trading`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await fetchInstruments();
    } finally {
      setTogglingKey(null);
    }
  }

  async function toggleDataCollection(
    instrumentKey: string,
    enabled: boolean,
  ) {
    setTogglingKey(instrumentKey);
    try {
      await fetch(
        `/api/admin/instruments/${instrumentKey}/data-collection`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );
      await fetchInstruments();
    } finally {
      setTogglingKey(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchInstruments();
  }

  const instruments = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / (data?.limit ?? 50));

  return (
    <SectionCard
      title="Instruments"
      action={
        <span className={styles.textMuted}>
          {data?.total ?? 0} instruments
        </span>
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

      {loading && !data ? (
        <div className={styles.loading}>Loading instruments...</div>
      ) : instruments.length === 0 ? (
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
                  <td className={styles.textRight}>
                    {inst.lotSize ?? "—"}
                  </td>
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
                          toggleTrading(
                            inst.instrumentKey,
                            !inst.tradingEnabled,
                          )
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
                          toggleDataCollection(
                            inst.instrumentKey,
                            !inst.dataCollectionEnabled,
                          )
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
        </>
      )}
    </SectionCard>
  );
}
