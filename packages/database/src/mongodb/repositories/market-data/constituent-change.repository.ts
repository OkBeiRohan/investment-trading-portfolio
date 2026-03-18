/**
 * Constituent Change Repository (MongoDB)
 * Manage Nifty 50 composition history
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ConstituentChange,
  ConstituentChangeDocument,
} from "../../schemas/market-data/constituent-change.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class ConstituentChangeRepository {
  constructor(
    @InjectModel(ConstituentChange.name, DatabaseConnections.MarketData)
    private readonly model: Model<ConstituentChangeDocument>,
  ) {}

  async create(
    change: Omit<ConstituentChange, "createdAt" | "updatedAt">,
  ): Promise<ConstituentChangeDocument> {
    return this.model.create(change);
  }

  async findByIndex(indexName: string): Promise<ConstituentChangeDocument[]> {
    return this.model.find({ indexName }).sort({ effectiveDate: -1 }).exec();
  }

  async findByDateRange(
    indexName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ConstituentChangeDocument[]> {
    return this.model
      .find({
        indexName,
        effectiveDate: { $gte: startDate, $lte: endDate },
      })
      .sort({ effectiveDate: -1 })
      .exec();
  }

  /**
   * Get constituents at a specific date
   * Works by replaying changes from inception
   */
  async getConstituentsAtDate(
    indexName: string,
    asOfDate: Date,
  ): Promise<string[]> {
    const changes = await this.model
      .find({
        indexName,
        effectiveDate: { $lte: asOfDate },
      })
      .sort({ effectiveDate: 1 })
      .exec();

    const constituents = new Set<string>();

    for (const change of changes) {
      if (change.changeType === "ADD" && change.addedInstrumentKey) {
        constituents.add(change.addedInstrumentKey);
      } else if (
        change.changeType === "REMOVE" &&
        change.removedInstrumentKey
      ) {
        constituents.delete(change.removedInstrumentKey);
      } else if (change.changeType === "REPLACE") {
        if (change.removedInstrumentKey) {
          constituents.delete(change.removedInstrumentKey);
        }
        if (change.addedInstrumentKey) {
          constituents.add(change.addedInstrumentKey);
        }
      }
    }

    return Array.from(constituents);
  }

  /**
   * Get current constituents (changes up to today)
   */
  async getCurrentConstituents(indexName: string): Promise<string[]> {
    return this.getConstituentsAtDate(indexName, new Date());
  }

  /**
   * Get constituents with weights at a specific date.
   * Replays changes from inception, tracking the latest weight for each instrument.
   */
  async getConstituentsWithWeightsAtDate(
    indexName: string,
    asOfDate: Date,
  ): Promise<Array<{ instrumentKey: string; symbol: string; weightPct: number; sector: string }>> {
    const changes = await this.model
      .find({ indexName, effectiveDate: { $lte: asOfDate } })
      .sort({ effectiveDate: 1 })
      .exec();

    const constituents = new Map<
      string,
      { instrumentKey: string; symbol: string; weightPct: number; sector: string }
    >();

    for (const change of changes) {
      if (change.removedInstrumentKey) {
        constituents.delete(change.removedInstrumentKey);
      }
      if (change.addedInstrumentKey) {
        constituents.set(change.addedInstrumentKey, {
          instrumentKey: change.addedInstrumentKey,
          symbol: change.addedSymbol ?? "",
          weightPct: change.addedWeightPct ?? 0,
          sector: change.addedSector ?? "",
        });
      }
    }

    return Array.from(constituents.values());
  }

  /**
   * Seed initial Nifty 50 data from hardcoded values (with weight + sector)
   */
  async seedNifty50(
    initialConstituents: Array<{
      instrumentKey: string;
      symbol: string;
      companyName: string;
      weightPct?: number;
      sector?: string;
      isin?: string;
    }>,
    asOfDate: Date = new Date("2020-01-01"),
  ): Promise<number> {
    const ops = initialConstituents.map((c) => ({
      updateOne: {
        filter: {
          indexName: "Nifty 50",
          effectiveDate: asOfDate,
          addedInstrumentKey: c.instrumentKey,
        },
        update: {
          $set: {
            indexName: "Nifty 50",
            effectiveDate: asOfDate,
            changeType: "ADD" as const,
            addedInstrumentKey: c.instrumentKey,
            addedSymbol: c.symbol,
            addedCompanyName: c.companyName,
            addedIsin: c.isin,
            addedWeightPct: c.weightPct,
            addedSector: c.sector,
            source: "initial_seed",
          },
        },
        upsert: true,
      },
    }));

    const result = await this.model.bulkWrite(ops);
    return result.upsertedCount;
  }

  /**
   * Seed a constituent replacement (removal + addition in one change)
   */
  async seedReplacement(change: {
    removedInstrumentKey: string;
    removedSymbol: string;
    removedCompanyName: string;
    addedInstrumentKey: string;
    addedSymbol: string;
    effectiveDate: Date;
    source?: string;
  }): Promise<void> {
    await this.model.updateOne(
      {
        indexName: "Nifty 50",
        effectiveDate: change.effectiveDate,
        removedInstrumentKey: change.removedInstrumentKey,
      },
      {
        $set: {
          indexName: "Nifty 50",
          effectiveDate: change.effectiveDate,
          changeType: "REPLACE" as const,
          removedInstrumentKey: change.removedInstrumentKey,
          removedSymbol: change.removedSymbol,
          removedCompanyName: change.removedCompanyName,
          addedInstrumentKey: change.addedInstrumentKey,
          addedSymbol: change.addedSymbol,
          source: change.source ?? "historical_seed",
        },
      },
      { upsert: true },
    );
  }
}
