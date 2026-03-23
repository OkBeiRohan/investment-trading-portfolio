/**
 * Constituent Weight tRPC Router
 *
 * Exposes Nifty 50 historical weight data from the HuggingFace dataset
 * to the web UI and other clients via tRPC.
 */

import { AllowAnonymous } from "@repo/authentication";
import { Query, Router, Input } from "nestjs-trpc-v2";
import { ConstituentWeightSnapshotRepository } from "@repo/database";
import z from "zod";

const INDEX_NAME = "Nifty 50";

@AllowAnonymous()
@Router({ alias: "constituentWeights" })
export class ConstituentWeightRouter {
  constructor(
    private readonly weightRepo: ConstituentWeightSnapshotRepository,
  ) {}

  /**
   * Get the latest constituent weight snapshot.
   */
  @Query({
    input: z.null().optional(),
    output: z.any(),
  })
  async getLatest() {
    const snapshot = await this.weightRepo.getLatestSnapshot(INDEX_NAME);
    if (!snapshot) return { snapshot: null };

    return {
      snapshot: {
        date: snapshot.date,
        constituentCount: snapshot.constituentCount,
        hhi: snapshot.hhi,
        top5WeightPct: snapshot.top5WeightPct,
        top10WeightPct: snapshot.top10WeightPct,
        constituents: snapshot.constituents.map((c) => ({
          symbol: c.symbol,
          weightPct: c.weightPct,
          sector: c.sector,
        })),
      },
    };
  }

  /**
   * Get constituent weights at a specific historical date.
   */
  @Query({
    input: z.object({ date: z.string() }),
    output: z.any(),
  })
  async getAtDate(@Input() input: { date: string }) {
    const date = new Date(input.date);
    const snapshot = await this.weightRepo.getWeightsAtDate(INDEX_NAME, date);
    if (!snapshot) return { snapshot: null, requestedDate: input.date };

    return {
      requestedDate: input.date,
      snapshotDate: snapshot.date,
      constituentCount: snapshot.constituentCount,
      hhi: snapshot.hhi,
      top5WeightPct: snapshot.top5WeightPct,
      top10WeightPct: snapshot.top10WeightPct,
      constituents: snapshot.constituents.map((c) => ({
        symbol: c.symbol,
        weightPct: c.weightPct,
        sector: c.sector,
      })),
    };
  }

  /**
   * Get weight history for a single symbol.
   */
  @Query({
    input: z.object({
      symbol: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
    output: z.any(),
  })
  async getSymbolHistory(
    @Input()
    input: { symbol: string; startDate?: string; endDate?: string },
  ) {
    const startDate = input.startDate
      ? new Date(input.startDate)
      : undefined;
    const endDate = input.endDate ? new Date(input.endDate) : undefined;

    const history = await this.weightRepo.getSymbolWeightHistory(
      INDEX_NAME,
      input.symbol,
      startDate,
      endDate,
    );

    return {
      symbol: input.symbol,
      dataPoints: history.length,
      history: history.map((h) => ({
        date: h.date,
        weightPct: h.weightPct,
      })),
    };
  }

  /**
   * Get sector weights at a specific date.
   */
  @Query({
    input: z.object({ date: z.string().optional() }),
    output: z.any(),
  })
  async getSectorWeights(@Input() input: { date?: string }) {
    const date = input.date ? new Date(input.date) : new Date();
    const sectors = await this.weightRepo.getSectorWeightsAtDate(
      INDEX_NAME,
      date,
    );

    return { date, sectors };
  }

  /**
   * Get concentration metrics (HHI, top-N) over time.
   */
  @Query({
    input: z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .optional(),
    output: z.any(),
  })
  async getConcentrationHistory(
    @Input() input?: { startDate?: string; endDate?: string },
  ) {
    const startDate = input?.startDate
      ? new Date(input.startDate)
      : undefined;
    const endDate = input?.endDate ? new Date(input.endDate) : undefined;

    const history = await this.weightRepo.getConcentrationHistory(
      INDEX_NAME,
      startDate,
      endDate,
    );

    return { dataPoints: history.length, history };
  }

  /**
   * Get all unique symbols that have ever been Nifty 50 constituents.
   */
  @Query({
    input: z.null().optional(),
    output: z.any(),
  })
  async getAllHistoricalSymbols() {
    const symbols =
      await this.weightRepo.getAllHistoricalSymbols(INDEX_NAME);
    return { count: symbols.length, symbols };
  }

  /**
   * Get available snapshot dates.
   */
  @Query({
    input: z.null().optional(),
    output: z.any(),
  })
  async getAvailableDates() {
    const dates = await this.weightRepo.getAvailableDates(INDEX_NAME);
    return { count: dates.length, dates };
  }

  /**
   * Get data status (count, date range).
   */
  @Query({
    input: z.null().optional(),
    output: z.any(),
  })
  async getStatus() {
    const [count, dateRange] = await Promise.all([
      this.weightRepo.count(INDEX_NAME),
      this.weightRepo.getDateRange(INDEX_NAME),
    ]);
    return { totalSnapshots: count, dateRange };
  }
}
