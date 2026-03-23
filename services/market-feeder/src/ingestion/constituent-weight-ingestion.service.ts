/**
 * Constituent Weight Ingestion Service
 *
 * Reads the HuggingFace dataset CSV files (weights.csv, sectors.csv)
 * from disk and loads them into the constituent_weight_snapshots collection
 * in MongoDB (MarketData database).
 *
 * Data source: AMP4010/Historical_Nifty_50_Constituent_Weights_20Y
 * - Monthly snapshots from 2008-01-31 to present
 * - 100 unique tickers, 50 active per snapshot
 * - Weights normalized to 100%
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConstituentWeightSnapshotRepository } from "@repo/database";
import * as fs from "fs";
import * as path from "path";

const INDEX_NAME = "Nifty 50";
const SOURCE = "huggingface_amp4010";

interface ParsedRow {
  date: Date;
  constituents: Array<{
    symbol: string;
    weightPct: number;
    sector?: string;
  }>;
}

@Injectable()
export class ConstituentWeightIngestionService {
  private readonly logger = new Logger(ConstituentWeightIngestionService.name);

  private readonly dataDir = path.resolve(
    __dirname,
    "../historical-data/hf-nifty50-weights",
  );

  constructor(
    private readonly weightSnapshotRepo: ConstituentWeightSnapshotRepository,
  ) {}

  /**
   * Full ingestion: parse CSVs and upsert all snapshots into MongoDB.
   * Safe to re-run (idempotent via upsert on indexName+date).
   */
  async ingestAll(): Promise<{
    snapshotsProcessed: number;
    upserted: number;
    modified: number;
    dateRange: { start: string; end: string };
    uniqueSymbols: number;
  }> {
    this.logger.log("Starting HuggingFace Nifty 50 weight ingestion...");

    const sectorMap = this.parseSectorsCsv();
    this.logger.log(`Loaded ${Object.keys(sectorMap).length} sector mappings`);

    const rows = this.parseWeightsCsv(sectorMap);
    this.logger.log(`Parsed ${rows.length} weight snapshots`);

    if (rows.length === 0) {
      this.logger.warn("No data rows found in weights.csv");
      return {
        snapshotsProcessed: 0,
        upserted: 0,
        modified: 0,
        dateRange: { start: "", end: "" },
        uniqueSymbols: 0,
      };
    }

    const allSymbols = new Set<string>();
    const snapshots = rows.map((row) => {
      const sorted = [...row.constituents].sort(
        (a, b) => b.weightPct - a.weightPct,
      );

      for (const c of sorted) allSymbols.add(c.symbol);

      const hhi = sorted.reduce(
        (sum, c) => sum + (c.weightPct / 100) ** 2,
        0,
      );
      const top5WeightPct = sorted
        .slice(0, 5)
        .reduce((s, c) => s + c.weightPct, 0);
      const top10WeightPct = sorted
        .slice(0, 10)
        .reduce((s, c) => s + c.weightPct, 0);

      return {
        indexName: INDEX_NAME,
        date: row.date,
        constituentCount: sorted.length,
        constituents: sorted,
        hhi: Math.round(hhi * 1e6) / 1e6,
        top5WeightPct: Math.round(top5WeightPct * 100) / 100,
        top10WeightPct: Math.round(top10WeightPct * 100) / 100,
        source: SOURCE,
      };
    });

    const BATCH_SIZE = 50;
    let totalUpserted = 0;
    let totalModified = 0;

    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const batch = snapshots.slice(i, i + BATCH_SIZE);
      const result = await this.weightSnapshotRepo.bulkUpsert(batch);
      totalUpserted += result.upserted;
      totalModified += result.modified;
    }

    const dateRange = {
      start: rows[0].date.toISOString().slice(0, 10),
      end: rows[rows.length - 1].date.toISOString().slice(0, 10),
    };

    this.logger.log(
      `Ingestion complete: ${snapshots.length} snapshots ` +
        `(${totalUpserted} new, ${totalModified} updated), ` +
        `${allSymbols.size} unique symbols, ` +
        `range ${dateRange.start} → ${dateRange.end}`,
    );

    return {
      snapshotsProcessed: snapshots.length,
      upserted: totalUpserted,
      modified: totalModified,
      dateRange,
      uniqueSymbols: allSymbols.size,
    };
  }

  /**
   * Parse sectors.csv → { symbol: sector }
   */
  private parseSectorsCsv(): Record<string, string> {
    const filePath = path.join(this.dataDir, "sectors.csv");
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`sectors.csv not found at ${filePath}`);
      return {};
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const map: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
      const [stock, sector] = lines[i].split(",").map((s) => s.trim());
      if (stock && sector) map[stock] = sector;
    }

    return map;
  }

  /**
   * Parse weights.csv → array of { date, constituents[] }
   *
   * Each row is a date with 100 ticker columns. Non-zero values
   * indicate the stock was a constituent on that date.
   */
  private parseWeightsCsv(sectorMap: Record<string, string>): ParsedRow[] {
    const filePath = path.join(this.dataDir, "weights.csv");
    if (!fs.existsSync(filePath)) {
      throw new Error(`weights.csv not found at ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    if (lines.length < 2) {
      throw new Error("weights.csv has no data rows");
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const dateIdx = headers.indexOf("DATE");
    if (dateIdx < 0) throw new Error('weights.csv missing "DATE" column');

    const tickerColumns = headers
      .map((h, i) => ({ symbol: h, idx: i }))
      .filter((c) => c.idx !== dateIdx);

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      if (cols.length < 2) continue;

      const dateStr = cols[dateIdx].trim();
      const date = new Date(dateStr + "T00:00:00.000Z");
      if (isNaN(date.getTime())) {
        this.logger.warn(`Skipping invalid date on row ${i + 1}: ${dateStr}`);
        continue;
      }

      const constituents: ParsedRow["constituents"] = [];

      for (const col of tickerColumns) {
        const raw = cols[col.idx]?.trim();
        if (!raw) continue;
        const weight = parseFloat(raw);
        if (isNaN(weight) || weight === 0) continue;

        constituents.push({
          symbol: col.symbol,
          weightPct: Math.round(weight * 1e5) / 1e5,
          sector: sectorMap[col.symbol],
        });
      }

      if (constituents.length > 0) {
        rows.push({ date, constituents });
      }
    }

    return rows;
  }

  /**
   * Check current ingestion status.
   */
  async getStatus(): Promise<{
    totalSnapshots: number;
    dateRange: { earliest: Date | null; latest: Date | null };
    uniqueSymbols: number;
  }> {
    const [count, dateRange, symbols] = await Promise.all([
      this.weightSnapshotRepo.count(INDEX_NAME),
      this.weightSnapshotRepo.getDateRange(INDEX_NAME),
      this.weightSnapshotRepo.getAllHistoricalSymbols(INDEX_NAME),
    ]);

    return {
      totalSnapshots: count,
      dateRange,
      uniqueSymbols: symbols.length,
    };
  }
}
