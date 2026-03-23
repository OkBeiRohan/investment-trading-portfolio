import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpstoxWebSocketService, UpstoxMarketData, SubscriptionPriority } from '@repo/market-sdk';
import {
  TickDataRepository,
  TickData,
  InstrumentMasterRepository,
  InstrumentRepository,
  DbConfigService,
} from '@repo/database';

@Injectable()
export class LiveDataService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(LiveDataService.name);

  private tickBuffer: TickData[] = [];
  private readonly MAX_BUFFER_SIZE = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000;

  private subscriptionIds: string[] = [];
  private isRunning = false;

  constructor(
    private readonly upstoxWs: UpstoxWebSocketService,
    private readonly tickRepo: TickDataRepository,
    private readonly instrumentMasterRepo: InstrumentMasterRepository,
    private readonly instrumentRepo: InstrumentRepository,
    private readonly dbConfig: DbConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Live Data Service initialized');
  }

  async onApplicationShutdown() {
    await this.stopLiveIngestion();
    await this.flushBuffer();
  }

  /**
   * Start fetching live ticks with two-tier WebSocket subscriptions:
   * - Tier 1 (full_d30): Core instruments (index, VIX, futures, near-term options) -- 30 depth levels
   * - Tier 2 (full): Remaining instruments (constituents, far-term options) -- 5 depth levels
   * Pool auto-creates multiple connections per tier when instrument count exceeds per-connection limits.
   */
  async startLiveIngestion(userId = 'system_ingestion') {
    if (this.isRunning) {
      this.logger.warn('Live ingestion is already running');
      return;
    }

    this.logger.log('Starting live data ingestion...');

    const allInstruments = await this.getActiveInstruments();
    if (allInstruments.length === 0) {
      this.logger.warn('No active instruments found to subscribe to.');
      return;
    }

    const { d30Instruments, fullInstruments } =
      this.splitByTier(allInstruments);
    const callback = this.handleMarketData.bind(this);

    this.logger.log(
      `Instrument tiers: ${d30Instruments.length} on full_d30 (30-depth), ${fullInstruments.length} on full (5-depth)`,
    );

    try {
      if (d30Instruments.length > 0) {
        const subId = await this.upstoxWs.subscribe(
          userId,
          d30Instruments,
          'full_d30',
          SubscriptionPriority.CRITICAL,
          callback,
        );
        this.subscriptionIds.push(subId);
        this.logger.log(
          `Tier 1 (full_d30): subscribed ${d30Instruments.length} instruments (sub: ${subId})`,
        );
      }

      if (fullInstruments.length > 0) {
        const subId = await this.upstoxWs.subscribe(
          userId,
          fullInstruments,
          'full',
          SubscriptionPriority.HIGH,
          callback,
        );
        this.subscriptionIds.push(subId);
        this.logger.log(
          `Tier 2 (full): subscribed ${fullInstruments.length} instruments (sub: ${subId})`,
        );
      }

      this.startFlushTimer();
      this.isRunning = true;
      this.logger.log(
        `Successfully started live ingestion (${this.subscriptionIds.length} subscriptions)`,
      );
    } catch (error) {
      this.logger.error('Failed to start live ingestion', error);
      throw error;
    }
  }

  /**
   * Split instruments into d30 (core) and full (rest) tiers.
   * d30 tier: indices, futures, and options expiring within 7 days (capped at 50).
   */
  private splitByTier(allInstruments: string[]): {
    d30Instruments: string[];
    fullInstruments: string[];
  } {
    const D30_MAX = 50;
    const d30Set = new Set<string>();

    for (const key of allInstruments) {
      if (
        key.startsWith('NSE_INDEX|') ||
        key.startsWith('BSE_INDEX|') ||
        key.startsWith('MCX_INDEX|')
      ) {
        d30Set.add(key);
      }
      if (key.startsWith('NSE_FO|') && !key.includes('|') === false) {
        d30Set.add(key);
      }
    }

    if (d30Set.size < D30_MAX) {
      const remaining = D30_MAX - d30Set.size;
      const foInstruments = allInstruments.filter(
        (k) => k.startsWith('NSE_FO|') && !d30Set.has(k),
      );
      for (let i = 0; i < Math.min(remaining, foInstruments.length); i++) {
        d30Set.add(foInstruments[i]);
      }
    }

    const d30Instruments = allInstruments.filter((k) => d30Set.has(k));
    const fullInstruments = allInstruments.filter((k) => !d30Set.has(k));

    if (d30Instruments.length > D30_MAX) {
      const overflow = d30Instruments.splice(D30_MAX);
      fullInstruments.unshift(...overflow);
    }

    return { d30Instruments, fullInstruments };
  }

  async stopLiveIngestion() {
    if (!this.isRunning) return;

    this.logger.log('Stopping live data ingestion...');

    this.stopFlushTimer();
    await this.flushBuffer();

    for (const subId of this.subscriptionIds) {
      await this.upstoxWs.unsubscribe(subId);
    }

    this.subscriptionIds = [];
    this.isRunning = false;

    this.logger.log('Live data ingestion stopped.');
  }

  /**
   * Build instrument list from MongoDB: all data-collection-enabled instruments
   * plus Nifty 50 constituents and indices (always included).
   */
  private async getActiveInstruments(): Promise<string[]> {
    const instrumentKeys = new Set<string>();

    const dataCollectionEnabled =
      await this.instrumentRepo.findDataCollectionEnabled();
    for (const inst of dataCollectionEnabled) {
      if (this.isUpstoxInstrument(inst.instrumentKey)) {
        instrumentKeys.add(inst.instrumentKey);
      }
    }

    const nifty50 = await this.instrumentRepo.findNifty50();
    for (const inst of nifty50) {
      if (this.isUpstoxInstrument(inst.instrumentKey)) {
        instrumentKeys.add(inst.instrumentKey);
      }
    }

    const indices = await this.instrumentRepo.findByType('INDEX');
    for (const inst of indices) {
      if (this.isUpstoxInstrument(inst.instrumentKey)) {
        instrumentKeys.add(inst.instrumentKey);
      }
    }

    const now = new Date();
    const allQuestDb = await this.instrumentMasterRepo.getAllInstruments();
    for (const inst of allQuestDb) {
      if (
        inst.instrumentType === 'INDEX' &&
        this.isUpstoxInstrument(inst.instrumentKey)
      ) {
        instrumentKeys.add(inst.instrumentKey);
      }
      if (inst.expiry && inst.expiry > now) {
        const daysToExpiry =
          (inst.expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysToExpiry <= 14) {
          instrumentKeys.add(inst.instrumentKey);
        }
      }
    }

    return Array.from(instrumentKeys);
  }

  private isUpstoxInstrument(key: string): boolean {
    return (
      key.startsWith('NSE_') || key.startsWith('BSE_') || key.startsWith('MCX_')
    );
  }

  /**
   * Handle incoming WebSocket message payload from Upstox
   */
  private handleMarketData(data: UpstoxMarketData) {
    if (!data.lastTradeTime) return;

    const bidPrices: number[] = Array(30).fill(0);
    const bidQtys: number[] = Array(30).fill(0);
    const askPrices: number[] = Array(30).fill(0);
    const askQtys: number[] = Array(30).fill(0);

    if (data.bid && data.bid.length > 0) {
      for (let i = 0; i < Math.min(data.bid.length, 30); i++) {
        bidPrices[i] = data.bid[i].price;
        bidQtys[i] = data.bid[i].quantity;
      }
    }

    if (data.ask && data.ask.length > 0) {
      for (let i = 0; i < Math.min(data.ask.length, 30); i++) {
        askPrices[i] = data.ask[i].price;
        askQtys[i] = data.ask[i].quantity;
      }
    }

    const tick: TickData = {
      timestamp: data.lastTradeTime,
      instrumentKey: data.instrumentKey,
      ltp: data.ltp || 0,
      ltq: data.ltq || 0,
      cp: data.cp || 0,
      atp: data.atp || 0,
      vtt: data.volume || 0,
      oi: data.oi || 0,
      tbq: data.tbq || bidQtys.reduce((a, b) => a + b, 0),
      tsq: data.tsq || askQtys.reduce((a, b) => a + b, 0),
      bidPrices,
      bidQtys,
      askPrices,
      askQtys,
    };

    this.tickBuffer.push(tick);

    // Broadcast internal event for Real-time Feature computation
    this.eventEmitter.emit('market.tick', tick);

    if (this.tickBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer().catch((e) =>
        this.logger.error('Error flushing tick buffer', e),
      );
    }
  }

  /**
   * Timer to ensure data is flushed even during low activity
   */
  private startFlushTimer() {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      if (this.tickBuffer.length > 0) {
        this.flushBuffer().catch((e) =>
          this.logger.error('Error in interval flush', e),
        );
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private ticksWritten = 0;
  private lastStatsLog = Date.now();

  /**
   * Insert buffered ticks into QuestDB
   */
  private async flushBuffer() {
    if (this.tickBuffer.length === 0) return;

    const ticksToInsert = [...this.tickBuffer];
    this.tickBuffer = [];

    try {
      await this.tickRepo.insertBatch(ticksToInsert);
      this.ticksWritten += ticksToInsert.length;

      const now = Date.now();
      if (now - this.lastStatsLog >= 60_000) {
        this.logger.log(
          `Tick write stats: ${this.ticksWritten} ticks written to QuestDB (buffer: ${this.tickBuffer.length})`,
        );
        this.ticksWritten = 0;
        this.lastStatsLog = now;
      }
    } catch (error) {
      this.logger.error(
        `Failed to insert ${ticksToInsert.length} ticks to DB`,
        error,
      );
      this.tickBuffer.unshift(...ticksToInsert);
    }
  }
}
