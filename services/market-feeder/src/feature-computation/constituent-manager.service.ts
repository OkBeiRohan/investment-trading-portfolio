import { Injectable, Logger } from '@nestjs/common';
import {
  NIFTY50_CONSTITUENTS_DATA,
  REMOVED_NIFTY50_CONSTITUENTS,
  NIFTY50_SECTOR_WEIGHTS,
} from '../historical-data/nifty50-instruments';

/**
 * Constituent Manager Service
 *
 * Manages Nifty 50 constituents including historical changes.
 * Returns appropriate stocks for a given timestamp considering removals/additions.
 */
@Injectable()
export class ConstituentManagerService {
  private readonly logger = new Logger(ConstituentManagerService.name);

  /**
   * Get active constituents for a specific timestamp
   *
   * Rules:
   * - If stock was removed on Sept 30, 2024 → use it until Sept 29, 2024 23:59:59
   * - After removal date → use the newly added stock
   *
   * @param timestamp - Point in time to check
   * @returns Array of instrument keys active at that time
   */
  getConstituentsAtTimestamp(timestamp: Date): string[] {
    const currentConstituents = NIFTY50_CONSTITUENTS_DATA.map(
      (c) => c.instrumentKey,
    );

    // Find any removals/additions that affect this timestamp
    const removedKeys = new Set<string>();
    const addedKeys = new Set<string>();

    for (const removal of REMOVED_NIFTY50_CONSTITUENTS) {
      const effectiveDate = this.parseEffectiveDate(removal.effectiveFrom);

      if (timestamp >= effectiveDate) {
        // After removal date: exclude removed stock, include new stock
        removedKeys.add(removal.instrumentKey);
        if (removal.addedInstrument) {
          addedKeys.add(removal.addedInstrument.instrumentKey);
        }
      } else {
        // Before removal date: include removed stock, exclude new stock
        addedKeys.add(removal.instrumentKey);
        if (removal.addedInstrument) {
          removedKeys.add(removal.addedInstrument.instrumentKey);
        }
      }
    }

    // Build final list
    const constituents = currentConstituents
      .filter((key) => !removedKeys.has(key))
      .concat(
        [...addedKeys].filter((key) => !currentConstituents.includes(key)),
      );

    return constituents;
  }

  /**
   * Get time ranges for historical constituents
   *
   * Returns a map of instrument key → [startDate, endDate]
   * Useful for batch processing historical data
   */
  getConstituentTimeRanges(): Map<
    string,
    { start: Date | null; end: Date | null }
  > {
    const ranges = new Map<string, { start: Date | null; end: Date | null }>();

    // Current constituents (active from inception to now)
    for (const constituent of NIFTY50_CONSTITUENTS_DATA) {
      ranges.set(constituent.instrumentKey, { start: null, end: null });
    }

    // Removed constituents (active until removal date)
    for (const removal of REMOVED_NIFTY50_CONSTITUENTS) {
      const effectiveDate = this.parseEffectiveDate(removal.effectiveFrom);
      ranges.set(removal.instrumentKey, {
        start: null,
        end: new Date(effectiveDate.getTime() - 1), // Day before removal
      });

      // Added instruments (active from addition date onwards)
      if (removal.addedInstrument) {
        ranges.set(removal.addedInstrument.instrumentKey, {
          start: effectiveDate,
          end: null,
        });
      }
    }

    return ranges;
  }

  /**
   * Parse effective date from DD-MM-YYYY format
   */
  private parseEffectiveDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  /**
   * Check if a constituent is active at a given timestamp
   */
  isActiveAt(instrumentKey: string, timestamp: Date): boolean {
    const constituents = this.getConstituentsAtTimestamp(timestamp);
    return constituents.includes(instrumentKey);
  }

  /**
   * Get all unique constituents (current + historical)
   */
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
   * Get weight of a constituent by instrument key (current constituents only)
   */
  getWeight(instrumentKey: string): number {
    const constituent = NIFTY50_CONSTITUENTS_DATA.find(
      (c) => c.instrumentKey === instrumentKey,
    );
    return constituent?.weightPct ?? 0;
  }

  /**
   * Get weight of a constituent by symbol (current constituents only)
   */
  getWeightBySymbol(symbol: string): number {
    const constituent = NIFTY50_CONSTITUENTS_DATA.find(
      (c) => c.symbol === symbol,
    );
    return constituent?.weightPct ?? 0;
  }

  /**
   * Get all current constituents with weights, sorted by weight descending
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
        weightPct: c.weightPct,
        industry: c.industry,
      }))
      .sort((a, b) => b.weightPct - a.weightPct);
  }

  /**
   * Get sector weights for the index
   */
  getSectorWeights(): Record<string, number> {
    return { ...NIFTY50_SECTOR_WEIGHTS };
  }

  /**
   * Get total weight of top N constituents
   */
  getTopNWeight(n: number): number {
    const sorted = this.getConstituentsWithWeights();
    return sorted.slice(0, n).reduce((sum, c) => sum + c.weightPct, 0);
  }
}
