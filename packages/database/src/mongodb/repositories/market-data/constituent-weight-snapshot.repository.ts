/**
 * Constituent Weight Snapshot Repository (MongoDB)
 *
 * Point-in-time weight queries for historical and live use.
 * Backed by monthly snapshots from the HuggingFace dataset.
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ConstituentWeightSnapshot,
  ConstituentWeightSnapshotDocument,
} from "../../schemas/market-data/constituent-weight-snapshot.schema";
import DatabaseConnections from "../../connections/connections";

export interface ConstituentWeightEntry {
  symbol: string;
  weightPct: number;
  sector?: string;
}

@Injectable()
export class ConstituentWeightSnapshotRepository {
  constructor(
    @InjectModel(
      ConstituentWeightSnapshot.name,
      DatabaseConnections.MarketData,
    )
    private readonly model: Model<ConstituentWeightSnapshotDocument>,
  ) {}

  /**
   * Get the most recent weight snapshot on or before the given date.
   * This is the primary query for point-in-time constituent weights.
   */
  async getWeightsAtDate(
    indexName: string,
    asOfDate: Date,
  ): Promise<ConstituentWeightSnapshotDocument | null> {
    return this.model
      .findOne({ indexName, date: { $lte: asOfDate } })
      .sort({ date: -1 })
      .lean()
      .exec();
  }

  /**
   * Get the latest available snapshot for an index.
   */
  async getLatestSnapshot(
    indexName: string,
  ): Promise<ConstituentWeightSnapshotDocument | null> {
    return this.model
      .findOne({ indexName })
      .sort({ date: -1 })
      .lean()
      .exec();
  }

  /**
   * Get weight history for a specific symbol across all snapshots.
   * Useful for tracking how a stock's index weight evolved over time.
   */
  async getSymbolWeightHistory(
    indexName: string,
    symbol: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ date: Date; weightPct: number }>> {
    const filter: Record<string, unknown> = {
      indexName,
      "constituents.symbol": symbol,
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.date as Record<string, Date>).$lte = endDate;
    }

    const snapshots = await this.model
      .find(filter, { date: 1, constituents: { $elemMatch: { symbol } } })
      .sort({ date: 1 })
      .lean()
      .exec();

    return snapshots.map((s) => ({
      date: s.date,
      weightPct: s.constituents[0]?.weightPct ?? 0,
    }));
  }

  /**
   * Get all snapshot dates available for an index.
   */
  async getAvailableDates(indexName: string): Promise<Date[]> {
    const results = await this.model
      .find({ indexName }, { date: 1 })
      .sort({ date: 1 })
      .lean()
      .exec();
    return results.map((r) => r.date);
  }

  /**
   * Get sector weight breakdown at a specific date.
   */
  async getSectorWeightsAtDate(
    indexName: string,
    asOfDate: Date,
  ): Promise<Record<string, number>> {
    const snapshot = await this.getWeightsAtDate(indexName, asOfDate);
    if (!snapshot) return {};

    const sectorWeights: Record<string, number> = {};
    for (const c of snapshot.constituents) {
      const sector = c.sector ?? "UNKNOWN";
      sectorWeights[sector] = (sectorWeights[sector] ?? 0) + c.weightPct;
    }
    return sectorWeights;
  }

  /**
   * Get concentration metrics (HHI, top-N weights) over time.
   */
  async getConcentrationHistory(
    indexName: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      date: Date;
      hhi: number;
      top5WeightPct: number;
      top10WeightPct: number;
    }>
  > {
    const filter: Record<string, unknown> = { indexName };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, Date>).$gte = startDate;
      if (endDate) (filter.date as Record<string, Date>).$lte = endDate;
    }

    const results = await this.model
      .find(filter, { date: 1, hhi: 1, top5WeightPct: 1, top10WeightPct: 1 })
      .sort({ date: 1 })
      .lean()
      .exec();

    return results.map((r) => ({
      date: r.date,
      hhi: r.hhi ?? 0,
      top5WeightPct: r.top5WeightPct ?? 0,
      top10WeightPct: r.top10WeightPct ?? 0,
    }));
  }

  /**
   * Bulk upsert snapshots (used by the ingestion script).
   * Each snapshot is keyed by (indexName, date).
   */
  async bulkUpsert(
    snapshots: Array<{
      indexName: string;
      date: Date;
      constituentCount: number;
      constituents: ConstituentWeightEntry[];
      hhi?: number;
      top5WeightPct?: number;
      top10WeightPct?: number;
      source?: string;
    }>,
  ): Promise<{ upserted: number; modified: number }> {
    if (snapshots.length === 0) return { upserted: 0, modified: 0 };

    const ops = snapshots.map((s) => ({
      updateOne: {
        filter: { indexName: s.indexName, date: s.date },
        update: { $set: s },
        upsert: true,
      },
    }));

    const result = await this.model.bulkWrite(ops);
    return {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Get total snapshot count for an index.
   */
  async count(indexName?: string): Promise<number> {
    const filter = indexName ? { indexName } : {};
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Get date range of available data.
   */
  async getDateRange(
    indexName: string,
  ): Promise<{ earliest: Date | null; latest: Date | null }> {
    const [earliest, latest] = await Promise.all([
      this.model
        .findOne({ indexName })
        .sort({ date: 1 })
        .select("date")
        .lean()
        .exec(),
      this.model
        .findOne({ indexName })
        .sort({ date: -1 })
        .select("date")
        .lean()
        .exec(),
    ]);

    return {
      earliest: earliest?.date ?? null,
      latest: latest?.date ?? null,
    };
  }

  /**
   * Get all unique symbols that have ever been constituents.
   */
  async getAllHistoricalSymbols(indexName: string): Promise<string[]> {
    const result = await this.model
      .distinct("constituents.symbol", { indexName })
      .exec();
    return result.sort();
  }
}
