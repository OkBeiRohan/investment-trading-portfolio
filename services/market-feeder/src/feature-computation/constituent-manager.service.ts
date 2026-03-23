import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConstituentWeightSnapshotRepository } from '@repo/database';
import {
  NIFTY50_CONSTITUENTS_DATA,
  REMOVED_NIFTY50_CONSTITUENTS,
  NIFTY50_SECTOR_WEIGHTS,
} from '../historical-data/nifty50-instruments';

const INDEX_NAME = 'Nifty 50';

interface WeightedConstituent {
  instrumentKey: string;
  symbol: string;
  weightPct: number;
  sector: string;
}

/**
 * Constituent Manager Service
 *
 * Manages Nifty 50 constituents and their weights using two data sources:
 *
 * 1. **MongoDB snapshots** (primary): Monthly weight data from the HuggingFace
 *    dataset (AMP4010/Historical_Nifty_50_Constituent_Weights_20Y), covering
 *    2008-01-31 to present. Point-in-time accurate, survivorship-bias-free.
 *
 * 2. **Static JSON** (fallback): Hardcoded current constituents with recent
 *    weights. Used when MongoDB data is unavailable.
 *
 * Historical weight queries always go to MongoDB. Current-state helpers
 * (for live trading) use a fast in-memory cache refreshed at startup.
 */
@Injectable()
export class ConstituentManagerService implements OnModuleInit {
  private readonly logger = new Logger(ConstituentManagerService.name);

  private dbAvailable = false;
  private latestDbSnapshot: WeightedConstituent[] | null = null;

  constructor(
    private readonly weightSnapshotRepo: ConstituentWeightSnapshotRepository,
  ) {}

  async onModuleInit() {
    try {
      const snapshot = await this.weightSnapshotRepo.getLatestSnapshot(INDEX_NAME);
      if (snapshot && snapshot.constituents.length > 0) {
        this.dbAvailable = true;
        this.latestDbSnapshot = snapshot.constituents.map((c) => ({
          instrumentKey: '',
          symbol: c.symbol,
          weightPct: c.weightPct,
          sector: c.sector ?? '',
        }));
        this.logger.log(
          `Loaded ${snapshot.constituents.length} constituents from DB ` +
            `(snapshot date: ${snapshot.date.toISOString().slice(0, 10)})`,
        );
      } else {
        this.logger.warn(
          'No weight snapshots in DB, falling back to static data. ' +
            'Run POST /ingestion/constituent-weights/ingest to populate.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Could not load DB weight snapshots, using static fallback: ${err}`,
      );
    }
  }

  // ================================================================
  //  POINT-IN-TIME QUERIES (MongoDB-backed)
  // ================================================================

  /**
   * Get constituent weights at a specific historical date.
   * Returns the most recent snapshot on or before the given date.
   * Falls back to static data if DB is empty.
   */
  async getWeightsAtDate(
    date: Date,
  ): Promise<Array<{ symbol: string; weightPct: number; sector: string }>> {
    if (this.dbAvailable) {
      const snapshot = await this.weightSnapshotRepo.getWeightsAtDate(
        INDEX_NAME,
        date,
      );
      if (snapshot) {
        return snapshot.constituents.map((c) => ({
          symbol: c.symbol,
          weightPct: c.weightPct,
          sector: c.sector ?? '',
        }));
      }
    }

    return NIFTY50_CONSTITUENTS_DATA.map((c) => ({
      symbol: c.symbol,
      weightPct: c.weightPct,
      sector: c.industry,
    }));
  }

  /**
   * Get the weight of a specific symbol at a specific date (from DB).
   */
  async getWeightAtDate(symbol: string, date: Date): Promise<number> {
    const weights = await this.getWeightsAtDate(date);
    return weights.find((w) => w.symbol === symbol)?.weightPct ?? 0;
  }

  /**
   * Get sector weight breakdown at a specific historical date.
   */
  async getSectorWeightsAtDate(
    date: Date,
  ): Promise<Record<string, number>> {
    if (this.dbAvailable) {
      return this.weightSnapshotRepo.getSectorWeightsAtDate(INDEX_NAME, date);
    }
    return { ...NIFTY50_SECTOR_WEIGHTS };
  }

  /**
   * Get a symbol's weight history across all available monthly snapshots.
   */
  async getSymbolWeightHistory(
    symbol: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ date: Date; weightPct: number }>> {
    if (!this.dbAvailable) return [];
    return this.weightSnapshotRepo.getSymbolWeightHistory(
      INDEX_NAME,
      symbol,
      startDate,
      endDate,
    );
  }

  /**
   * Get concentration metrics (HHI, top-N) over time.
   */
  async getConcentrationHistory(
    startDate?: Date,
    endDate?: Date,
  ) {
    if (!this.dbAvailable) return [];
    return this.weightSnapshotRepo.getConcentrationHistory(
      INDEX_NAME,
      startDate,
      endDate,
    );
  }

  /**
   * Get all unique symbols that have ever been in Nifty 50 (from DB).
   */
  async getAllHistoricalSymbols(): Promise<string[]> {
    if (!this.dbAvailable) return this.getAllUniqueConstituents().map((k) => {
      const match = NIFTY50_CONSTITUENTS_DATA.find((c) => c.instrumentKey === k);
      return match?.symbol ?? k;
    });
    return this.weightSnapshotRepo.getAllHistoricalSymbols(INDEX_NAME);
  }

  // ================================================================
  //  CURRENT-STATE HELPERS (in-memory, for live trading)
  // ================================================================

  /**
   * Get active constituent instrument keys for a specific timestamp.
   * Uses the static changelist for sub-monthly precision.
   */
  getConstituentsAtTimestamp(timestamp: Date): string[] {
    const currentConstituents = NIFTY50_CONSTITUENTS_DATA.map(
      (c) => c.instrumentKey,
    );

    const removedKeys = new Set<string>();
    const addedKeys = new Set<string>();

    for (const removal of REMOVED_NIFTY50_CONSTITUENTS) {
      const effectiveDate = this.parseEffectiveDate(removal.effectiveFrom);

      if (timestamp >= effectiveDate) {
        removedKeys.add(removal.instrumentKey);
        if (removal.addedInstrument) {
          addedKeys.add(removal.addedInstrument.instrumentKey);
        }
      } else {
        addedKeys.add(removal.instrumentKey);
        if (removal.addedInstrument) {
          removedKeys.add(removal.addedInstrument.instrumentKey);
        }
      }
    }

    return currentConstituents
      .filter((key) => !removedKeys.has(key))
      .concat(
        [...addedKeys].filter((key) => !currentConstituents.includes(key)),
      );
  }

  getConstituentTimeRanges(): Map<
    string,
    { start: Date | null; end: Date | null }
  > {
    const ranges = new Map<string, { start: Date | null; end: Date | null }>();

    for (const constituent of NIFTY50_CONSTITUENTS_DATA) {
      ranges.set(constituent.instrumentKey, { start: null, end: null });
    }

    for (const removal of REMOVED_NIFTY50_CONSTITUENTS) {
      const effectiveDate = this.parseEffectiveDate(removal.effectiveFrom);
      ranges.set(removal.instrumentKey, {
        start: null,
        end: new Date(effectiveDate.getTime() - 1),
      });

      if (removal.addedInstrument) {
        ranges.set(removal.addedInstrument.instrumentKey, {
          start: effectiveDate,
          end: null,
        });
      }
    }

    return ranges;
  }

  private parseEffectiveDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  isActiveAt(instrumentKey: string, timestamp: Date): boolean {
    return this.getConstituentsAtTimestamp(timestamp).includes(instrumentKey);
  }

  getAllUniqueConstituents(): string[] {
    const all = new Set<string>();

    for (const constituent of NIFTY50_CONSTITUENTS_DATA) {
      all.add(constituent.instrumentKey);
    }

    for (const removal of REMOVED_NIFTY50_CONSTITUENTS) {
      all.add(removal.instrumentKey);
      if (removal.addedInstrument) {
        all.add(removal.addedInstrument.instrumentKey);
      }
    }

    return [...all];
  }

  /**
   * Get weight of a constituent by instrument key.
   * Uses latest DB snapshot if available, otherwise static JSON.
   */
  getWeight(instrumentKey: string): number {
    const staticMatch = NIFTY50_CONSTITUENTS_DATA.find(
      (c) => c.instrumentKey === instrumentKey,
    );
    if (!staticMatch) return 0;

    if (this.latestDbSnapshot) {
      const dbMatch = this.latestDbSnapshot.find(
        (c) => c.symbol === staticMatch.symbol,
      );
      if (dbMatch) return dbMatch.weightPct;
    }

    return staticMatch.weightPct;
  }

  /**
   * Get weight of a constituent by symbol.
   * Uses latest DB snapshot if available, otherwise static JSON.
   */
  getWeightBySymbol(symbol: string): number {
    if (this.latestDbSnapshot) {
      const dbMatch = this.latestDbSnapshot.find((c) => c.symbol === symbol);
      if (dbMatch) return dbMatch.weightPct;
    }

    const staticMatch = NIFTY50_CONSTITUENTS_DATA.find(
      (c) => c.symbol === symbol,
    );
    return staticMatch?.weightPct ?? 0;
  }

  /**
   * Get all current constituents with weights, sorted descending.
   * Merges DB weights (if available) with static instrument key data.
   */
  getConstituentsWithWeights(): Array<{
    instrumentKey: string;
    symbol: string;
    weightPct: number;
    industry: string;
  }> {
    return NIFTY50_CONSTITUENTS_DATA
      .map((c) => ({
        instrumentKey: c.instrumentKey,
        symbol: c.symbol,
        weightPct: this.getWeightBySymbol(c.symbol),
        industry: c.industry,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);
  }

  getSectorWeights(): Record<string, number> {
    return { ...NIFTY50_SECTOR_WEIGHTS };
  }

  getTopNWeight(n: number): number {
    const sorted = this.getConstituentsWithWeights();
    return sorted.slice(0, n).reduce((sum, c) => sum + c.weightPct, 0);
  }

  /** Whether the DB weight data is loaded and available. */
  isDbAvailable(): boolean {
    return this.dbAvailable;
  }
}
