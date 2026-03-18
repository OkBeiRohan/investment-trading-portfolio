import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpstoxWebSocketService, UpstoxMarketData } from '@repo/market-sdk';
import {
  TickDataRepository,
  TickData,
  InstrumentMasterRepository,
  InstrumentRepository,
  DbConfigService,
} from '@repo/database';

@Injectable()
export class LiveDataService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(LiveDataService.name);

  private tickBuffer: TickData[] = [];
  private readonly MAX_BUFFER_SIZE = 5000;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 1000;

  private subscriptionId: string | null = null;
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
   * Start fetching live ticks for indices and active options/futures
   */
  async startLiveIngestion(userId = 'system_ingestion') {
    if (this.isRunning) {
      this.logger.warn('Live ingestion is already running');
      return;
    }

    this.logger.log('Starting live data ingestion...');

    // 1. Get high-priority instruments (Indices + Front Month Options/Futures)
    const instruments = await this.getActiveInstruments();

    if (instruments.length === 0) {
      this.logger.warn('No active instruments found to subscribe to.');
      return;
    }

    this.logger.log(`Subscribing to ${instruments.length} instruments for live ticks...`);

    try {
      // 2. Subscribe to Upstox WebSocket
      // Using 'full' mode to get Market Level Depth (bids/asks/greeks/oi)
      this.subscriptionId = await this.upstoxWs.subscribe(
        userId,
        instruments,
        'full',
        20, // CRITICAL Priority
        this.handleMarketData.bind(this)
      );

      // 3. Start flush timer
      this.startFlushTimer();
      this.isRunning = true;
      this.logger.log(`Successfully started live ingestion (sub: ${this.subscriptionId})`);
    } catch (error) {
      this.logger.error('Failed to start live ingestion', error);
      throw error;
    }
  }

  /**
   * Stop Fetching Live Ticks
   */
  async stopLiveIngestion() {
    if (!this.isRunning || !this.subscriptionId) return;

    this.logger.log('Stopping live data ingestion...');
    
    this.stopFlushTimer();
    await this.flushBuffer();

    await this.upstoxWs.unsubscribe(this.subscriptionId);
    
    this.subscriptionId = null;
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

    const indices = await this.instrumentRepo.findByType("INDEX");
    for (const inst of indices) {
      if (this.isUpstoxInstrument(inst.instrumentKey)) {
        instrumentKeys.add(inst.instrumentKey);
      }
    }

    const now = new Date();
    const allQuestDb = await this.instrumentMasterRepo.getAllInstruments();
    for (const inst of allQuestDb) {
      if (inst.instrumentType === "INDEX" && this.isUpstoxInstrument(inst.instrumentKey)) {
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
    return key.startsWith("NSE_") || key.startsWith("BSE_") || key.startsWith("MCX_");
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
      this.flushBuffer().catch(e => this.logger.error('Error flushing tick buffer', e));
    }
  }

  /**
   * Timer to ensure data is flushed even during low activity
   */
  private startFlushTimer() {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      if (this.tickBuffer.length > 0) {
        this.flushBuffer().catch(e => this.logger.error('Error in interval flush', e));
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Insert buffered ticks into QuestDB
   */
  private async flushBuffer() {
    if (this.tickBuffer.length === 0) return;

    // Local swap to not block incoming ticks
    const ticksToInsert = [...this.tickBuffer];
    this.tickBuffer = [];

    try {
      await this.tickRepo.insertBatch(ticksToInsert);
    } catch (error) {
      this.logger.error(`Failed to insert ${ticksToInsert.length} ticks to DB`, error);
      // Re-insert into beginning of buffer if failed so we don't lose data
      this.tickBuffer.unshift(...ticksToInsert);
    }
  }
}
