/**
 * MCX Handler Service
 *
 * Processes real-time tick data from MCX commodity futures.
 * Instruments are subscribed via Upstox WebSocket in `ltpc` mode
 * (bundled with the main NSE subscription pool).
 *
 * Responsibilities:
 * - Maintain in-memory state per MCX instrument (ltp, prevClose, %)
 * - Store snapshots to Redis for consumption by algo-worker + Tier 0/1 features
 * - Expose typed MCX snapshots for GlobalDataService overnight computation
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  MCX_INSTRUMENT_PREFIXES,
  MCX_REDIS_KEY_PREFIX,
  MCX_SESSION,
} from '@repo/market-sdk';
import {
  type McxCommodity,
  type McxCommoditySnapshot,
  MCX_COMMODITIES,
} from '@repo/schema';
import { REDIS_CLIENT } from '@repo/database';
import { Inject } from '@nestjs/common';

/**
 * Internal per-instrument state maintained in memory.
 */
interface McxInstrumentState {
  ltp: number;
  prevClose: number;
  volume: number;
  instrumentKey: string;
  commodity: McxCommodity;
  timestamp: Date;
}

interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<any>;
}

@Injectable()
export class McxHandlerService {
  private readonly logger = new Logger(McxHandlerService.name);
  private readonly state = new Map<McxCommodity, McxInstrumentState>();

  /** Resolved instrument keys (after front-month resolution by InstrumentSyncService) */
  private resolvedKeys = new Map<string, McxCommodity>(); // instrumentKey → commodity

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: IRedisClient | null,
  ) {}

  /**
   * Called by LiveDataService when a tick arrives for MCX_FO|* instruments.
   */
  handleTick(instrumentKey: string, ltp: number, volume: number = 0): void {
    const commodity = this.resolvedKeys.get(instrumentKey);
    if (!commodity) {
      this.logger.debug(
        `Unregistered MCX instrument tick: ${instrumentKey} — call registerInstrument first`,
      );
      return;
    }

    const existing = this.state.get(commodity);
    const prevClose = existing?.prevClose ?? ltp; // fallback: treat first tick as prev close

    const updated: McxInstrumentState = {
      ltp,
      prevClose,
      volume: (existing?.volume ?? 0) + volume,
      instrumentKey,
      commodity,
      timestamp: new Date(),
    };

    this.state.set(commodity, updated);

    // Write to Redis for cross-process access (algo-worker, feature computation)
    this.cacheToRedis(commodity, updated).catch((err) =>
      this.logger.warn(`Redis write failed for ${commodity}: ${err?.message}`),
    );
  }

  /**
   * Register a resolved front-month contract for a commodity.
   * Called by InstrumentSyncService at startup and on contract roll.
   */
  registerInstrument(
    commodity: McxCommodity,
    instrumentKey: string,
    prevClose: number,
  ): void {
    this.resolvedKeys.set(instrumentKey, commodity);
    this.state.set(commodity, {
      ltp: prevClose,
      prevClose,
      volume: 0,
      instrumentKey,
      commodity,
      timestamp: new Date(),
    });

    this.logger.log(
      `Registered MCX instrument: ${commodity} → ${instrumentKey} (prevClose=${prevClose})`,
    );
  }

  /**
   * Get the current snapshot for a single commodity.
   */
  getSnapshot(commodity: McxCommodity): McxCommoditySnapshot | null {
    const s = this.state.get(commodity);
    if (!s) return null;
    return this.toSnapshot(s);
  }

  /**
   * Get snapshots for all registered MCX commodities.
   * Used by GlobalDataService at 09:08 IST for Tier 0 feature computation.
   */
  getAllSnapshots(): McxCommoditySnapshot[] {
    return Array.from(this.state.values()).map(this.toSnapshot);
  }

  /**
   * Get list of resolved MCX instrument keys (ready to subscribe via WebSocket).
   */
  getResolvedInstrumentKeys(): string[] {
    return Array.from(this.resolvedKeys.keys());
  }

  /**
   * Update prevClose prices at the start of a new session.
   * Called by InstrumentSyncService each morning before market open.
   */
  setPrevClose(commodity: McxCommodity, prevClose: number): void {
    const existing = this.state.get(commodity);
    if (existing) {
      existing.prevClose = prevClose;
      this.state.set(commodity, existing);
    }
  }

  /**
   * Check if MCX market is currently in session (09:00 – 23:30 IST).
   */
  isMarketOpen(): boolean {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);

    const hours = ist.getUTCHours();
    const minutes = ist.getUTCMinutes();
    const currentMinutes = hours * 60 + minutes;

    const openMinutes =
      MCX_SESSION.OPEN_HOUR * 60 + MCX_SESSION.OPEN_MINUTE;
    const closeMinutes =
      MCX_SESSION.CLOSE_HOUR * 60 + MCX_SESSION.CLOSE_MINUTE;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  private toSnapshot = (s: McxInstrumentState): McxCommoditySnapshot => ({
    instrumentKey: s.instrumentKey,
    commodity: s.commodity,
    ltp: s.ltp,
    prevClose: s.prevClose,
    intradayChangePct:
      s.prevClose > 0 ? ((s.ltp - s.prevClose) / s.prevClose) * 100 : 0,
    volume: s.volume,
    timestamp: s.timestamp,
    isMarketOpen: this.isMarketOpen(),
  });

  private async cacheToRedis(
    commodity: McxCommodity,
    state: McxInstrumentState,
  ): Promise<void> {
    if (!this.redis) return;

    const key = `${MCX_REDIS_KEY_PREFIX}${commodity}`;
    const snapshot = this.toSnapshot(state);

    // TTL = 27 hours (covers overnight gap between sessions)
    await this.redis.set(key, JSON.stringify(snapshot), 'EX', 97200);
  }
}
