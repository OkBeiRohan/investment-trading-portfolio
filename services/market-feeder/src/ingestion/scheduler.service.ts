import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import {
  DbConfigService,
  ProcessingLogRepository,
  InstrumentRepository,
} from "@repo/database";
import { MarketCalendarService, GLOBAL_SYMBOL_MAPPINGS } from "@repo/market-sdk";
import { InstrumentSyncService } from "./instrument-sync.service";
import { InstrumentListSyncService } from "./instrument-list-sync.service";
import { HistoricalBackfillService } from "./historical-backfill.service";
import { GlobalDataService } from "./global-data.service";
import { LiveDataService } from "./live-data.service";
import { OptionChainLiveService } from "./option-chain-live.service";
import {
  NIFTY50_CONSTITUENTS_DATA,
  NIFTY50_INDEX,
  INDIA_VIX,
  NIFTY50_FUTURES,
  REMOVED_NIFTY50_CONSTITUENTS,
} from "../historical-data/nifty50-instruments";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  private liveIntervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly dbConfig: DbConfigService,
    private readonly marketCalendar: MarketCalendarService,
    private readonly instrumentSync: InstrumentSyncService,
    private readonly instrumentListSync: InstrumentListSyncService,
    private readonly historicalBackfill: HistoricalBackfillService,
    private readonly globalData: GlobalDataService,
    private readonly liveData: LiveDataService,
    private readonly optionChainLive: OptionChainLiveService,
    private readonly processingLogRepo: ProcessingLogRepository,
    private readonly instrumentRepo: InstrumentRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapIfFirstRun();
    await this.registerDynamicCrons();
    await this.handleStartupTasks();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FIRST-RUN BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════════════

  private async bootstrapIfFirstRun(): Promise<void> {
    const summary = await this.instrumentRepo.getSummary();

    if (summary.total > 0) {
      this.logger.log(
        `Instruments already populated (${summary.total} total) — skipping bootstrap`,
      );
      return;
    }

    this.logger.log("═".repeat(60));
    this.logger.log("FIRST RUN DETECTED — Bootstrapping Nifty 50 trading setup");
    this.logger.log("═".repeat(60));

    // Step 1: Seed only the instruments required for Nifty 50 trading + features
    this.logger.log("[BOOTSTRAP] Step 1: Seeding Nifty 50 instruments...");
    await this.seedNifty50Instruments();

    // Step 2: Seed MCX commodities (required for Tier 0 features)
    this.logger.log("[BOOTSTRAP] Step 2: Seeding MCX commodities...");
    await this.seedMcxCommodities();

    // Step 3: Seed global data instruments (Yahoo Finance symbols for feature computation)
    this.logger.log("[BOOTSTRAP] Step 3: Seeding global data instruments...");
    await this.seedGlobalInstruments();

    // Step 4: Sync Nifty options/futures details from Upstox API
    this.logger.log("[BOOTSTRAP] Step 4: Syncing Nifty options & expired instruments...");
    try {
      await this.instrumentSync.syncAll();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[BOOTSTRAP] Instrument detail sync: ${msg}`);
    }

    this.logger.log("═".repeat(60));
    this.logger.log("BOOTSTRAP COMPLETE");
    this.logger.log("═".repeat(60));
  }

  /**
   * Seed Nifty 50 index, current 50 constituents, removed constituents,
   * and Nifty futures. Only these are enabled for trading/data collection.
   */
  private async seedNifty50Instruments(): Promise<void> {
    let count = 0;

    // Nifty 50 Index + India VIX
    for (const key of [NIFTY50_INDEX, INDIA_VIX]) {
      await this.instrumentRepo.upsert({
        instrumentKey: key,
        instrumentType: "INDEX",
        exchange: "NSE",
        segment: "INDEX",
        tradingSymbol: key.split("|")[1],
        name: key.split("|")[1],
        isActive: true,
        isNifty50: true,
        tradingEnabled: true,
        dataCollectionEnabled: true,
      });
      count++;
    }

    // Current 50 constituents (with weight and sector data)
    for (const c of NIFTY50_CONSTITUENTS_DATA) {
      await this.instrumentRepo.upsert({
        instrumentKey: c.instrumentKey,
        instrumentType: "EQUITY",
        exchange: "NSE",
        segment: "EQ",
        tradingSymbol: c.symbol,
        name: c.companyName,
        isin: c.isin,
        industry: c.industry,
        isActive: true,
        isNifty50: true,
        tradingEnabled: true,
        dataCollectionEnabled: true,
        nifty50WeightPct: c.weightPct,
      });
      count++;
    }

    // Nifty futures (near/next/far month)
    for (const key of NIFTY50_FUTURES) {
      await this.instrumentRepo.upsert({
        instrumentKey: key,
        instrumentType: "FUTURE",
        exchange: "NSE",
        segment: "FO",
        tradingSymbol: "NIFTY FUT",
        name: "NIFTY FUT",
        underlyingKey: NIFTY50_INDEX,
        isActive: true,
        tradingEnabled: true,
        dataCollectionEnabled: true,
      });
      count++;
    }

    // Removed constituents (historical data for survivorship-bias-free features)
    for (const r of REMOVED_NIFTY50_CONSTITUENTS) {
      await this.instrumentRepo.upsert({
        instrumentKey: r.instrumentKey,
        instrumentType: "EQUITY",
        exchange: "NSE",
        segment: "EQ",
        tradingSymbol: r.symbol,
        name: r.companyName,
        isActive: true,
        isNifty50: false,
        tradingEnabled: false,
        dataCollectionEnabled: true,
      });
      count++;
    }

    this.logger.log(
      `[BOOTSTRAP] Seeded ${count} instruments: 2 indices, ${NIFTY50_CONSTITUENTS_DATA.length} constituents, ${NIFTY50_FUTURES.length} futures, ${REMOVED_NIFTY50_CONSTITUENTS.length} removed`,
    );
  }

  /**
   * Seed MCX commodity futures required for Tier 0 features.
   * Crude Oil, Natural Gas, Gold, Silver, Copper.
   */
  private async seedMcxCommodities(): Promise<void> {
    const mcxCommodities = [
      { prefix: "CRUDEOIL", name: "Crude Oil" },
      { prefix: "NATURALGAS", name: "Natural Gas" },
      { prefix: "GOLD", name: "Gold" },
      { prefix: "SILVER", name: "Silver" },
      { prefix: "COPPER", name: "Copper" },
    ];

    let count = 0;
    for (const commodity of mcxCommodities) {
      const key = `MCX_FO|${commodity.prefix}`;
      await this.instrumentRepo.upsert({
        instrumentKey: key,
        instrumentType: "FUTURE",
        exchange: "MCX",
        segment: "MCX",
        tradingSymbol: commodity.prefix,
        name: commodity.name,
        isActive: true,
        tradingEnabled: false,
        dataCollectionEnabled: true,
      });
      count++;
    }

    this.logger.log(`[BOOTSTRAP] Seeded ${count} MCX commodity instruments`);
  }

  /**
   * Seed global instruments tracked via Yahoo Finance, Alpha Vantage, Finnhub.
   * These are virtual instruments (GLOBAL|*) used for Tier 0/1 macro features.
   */
  private async seedGlobalInstruments(): Promise<void> {
    let count = 0;

    for (const instrumentKey of Object.keys(GLOBAL_SYMBOL_MAPPINGS)) {
      const name = instrumentKey.replace("GLOBAL|", "");
      const isForex = instrumentKey.includes("/");
      const isBond = instrumentKey.includes("Yield");
      const isCommodity = ["Crude Oil", "Gold", "Silver", "Copper", "Natural Gas"].some(
        (c) => instrumentKey.includes(c),
      );

      let segment = "INDEX";
      if (isForex) segment = "FOREX";
      else if (isBond) segment = "BOND";
      else if (isCommodity) segment = "COMMODITY";

      await this.instrumentRepo.upsert({
        instrumentKey,
        instrumentType: "INDEX",
        exchange: "GLOBAL",
        segment,
        tradingSymbol: name,
        name,
        isActive: true,
        tradingEnabled: false,
        dataCollectionEnabled: true,
      });
      count++;
    }

    this.logger.log(`[BOOTSTRAP] Seeded ${count} global instruments (Yahoo Finance)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DYNAMIC CRON REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════

  private async registerDynamicCrons(): Promise<void> {
    const config = await this.dbConfig.getSchedulerConfig();

    const jobs: Array<{
      name: string;
      cron: string;
      enabled: boolean;
      handler: () => Promise<void>;
      requiresTradingDay: boolean;
    }> = [
      {
        name: "instrument-list-sync",
        cron: config.instrumentListSync.cronExpression,
        enabled: config.instrumentListSync.enabled,
        handler: () => this.runInstrumentListSync(),
        requiresTradingDay: false,
      },
      {
        name: "instrument-detail-sync",
        cron: config.instrumentDetailSync.cronExpression,
        enabled: config.instrumentDetailSync.enabled,
        handler: () => this.runInstrumentDetailSync(),
        requiresTradingDay: true,
      },
      {
        name: "nightly-backfill",
        cron: config.nightlyBackfill.cronExpression,
        enabled: config.nightlyBackfill.enabled,
        handler: () =>
          this.runNightlyBackfill(config.nightlyBackfill.lookbackDays),
        requiresTradingDay: false,
      },
      {
        name: "pre-market-global",
        cron: config.preMarketGlobal.cronExpression,
        enabled: config.preMarketGlobal.enabled,
        handler: () => this.runPreMarketGlobal(),
        requiresTradingDay: true,
      },
      {
        name: "eod-reconciliation",
        cron: config.eodReconciliation.cronExpression,
        enabled: config.eodReconciliation.enabled,
        handler: () => this.runEodReconciliation(),
        requiresTradingDay: true,
      },
    ];

    for (const job of jobs) {
      if (!job.enabled) {
        this.logger.log(`Cron [${job.name}] is disabled`);
        continue;
      }

      const cronJob = new CronJob(
        job.cron,
        async () => {
          if (job.requiresTradingDay) {
            const isTradingDay =
              await this.marketCalendar.isMarketOpenToday("NSE");
            if (!isTradingDay) {
              this.logger.debug(
                `[CRON] ${job.name} skipped — not a trading day`,
              );
              return;
            }
          }
          await job.handler();
        },
        null,
        false,
        "UTC",
      );

      this.schedulerRegistry.addCronJob(job.name, cronJob);
      cronJob.start();
      this.logger.log(`Cron [${job.name}] registered: ${job.cron}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STARTUP TASKS
  // ═══════════════════════════════════════════════════════════════════════

  private async handleStartupTasks(): Promise<void> {
    const isOpen = await this.marketCalendar.isMarketCurrentlyOpen("NSE");

    if (isOpen) {
      this.logger.log(
        "Market is currently open — starting live session (WebSocket + data enrichment)",
      );

      try {
        await this.liveData.startLiveIngestion();
        this.logger.log("Live WebSocket ingestion started successfully");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to start live WebSocket ingestion: ${msg}`);
      }

      await this.runLivePrefill();
      this.startLiveIntervals();
    } else {
      this.logger.log(
        "Market is currently closed — running startup backfill",
      );
      try {
        await this.runStartupBackfill();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Startup backfill failed: ${msg}`);
      }
    }
  }

  /**
   * Prefill: immediate fetch of global data + option chain so ML features
   * have baseline data before the first periodic interval fires.
   */
  private async runLivePrefill(): Promise<void> {
    this.logger.log("[PREFILL] Running initial data fetch for live session...");

    const results = await Promise.allSettled([
      this.globalData.fetchOvernightData().then((r) => {
        this.logger.log(`[PREFILL] Global data: ${r.symbolsFetched} symbols, ${r.totalCandles} candles`);
      }),
      this.optionChainLive.fetchAndStoreOptionChainSnapshot().then((r) => {
        this.logger.log(`[PREFILL] Option chain: ${r.snapshotsStored} snapshots, ${r.ticksStored} ticks`);
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.error(`[PREFILL] Failed: ${result.reason}`);
      }
    }

    this.logger.log("[PREFILL] Initial data fetch complete");
  }

  /**
   * Start periodic data enrichment intervals during live market hours.
   * Intervals auto-stop when market closes.
   */
  private startLiveIntervals(): void {
    this.logger.log("[LIVE] Starting periodic data enrichment intervals");

    const GLOBAL_DATA_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const OPTION_CHAIN_INTERVAL_MS = 60 * 1000; // 60 seconds

    const globalInterval = setInterval(async () => {
      try {
        const isOpen = await this.marketCalendar.isMarketCurrentlyOpen("NSE");
        if (!isOpen) {
          this.logger.log("[LIVE] Market closed — stopping global data interval");
          this.clearLiveIntervals();
          return;
        }
        const result = await this.globalData.fetchOvernightData();
        this.logger.debug(`[LIVE] Global data refreshed: ${result.symbolsFetched} symbols`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[LIVE] Global data fetch failed: ${msg}`);
      }
    }, GLOBAL_DATA_INTERVAL_MS);

    const optionChainInterval = setInterval(async () => {
      try {
        const isOpen = await this.marketCalendar.isMarketCurrentlyOpen("NSE");
        if (!isOpen) {
          this.logger.log("[LIVE] Market closed — stopping option chain interval");
          this.clearLiveIntervals();
          return;
        }
        const result = await this.optionChainLive.fetchAndStoreOptionChainSnapshot();
        if (result.errors.length > 0) {
          this.logger.warn(`[LIVE] Option chain had ${result.errors.length} errors`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`[LIVE] Option chain fetch failed: ${msg}`);
      }
    }, OPTION_CHAIN_INTERVAL_MS);

    this.liveIntervals.push(globalInterval, optionChainInterval);

    this.logger.log(
      `[LIVE] Intervals started: global data every ${GLOBAL_DATA_INTERVAL_MS / 1000}s, option chain every ${OPTION_CHAIN_INTERVAL_MS / 1000}s`,
    );
  }

  private clearLiveIntervals(): void {
    for (const interval of this.liveIntervals) {
      clearInterval(interval);
    }
    this.liveIntervals = [];
    this.logger.log("[LIVE] All live intervals cleared");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // JOB IMPLEMENTATIONS
  // ═══════════════════════════════════════════════════════════════════════

  private async runInstrumentListSync(): Promise<void> {
    this.logger.log("[CRON] Instrument list sync starting");
    try {
      await this.processingLogRepo.logInfo(
        "CRON",
        "INSTRUMENT_LIST_SYNC",
        "Started",
        { service: "SchedulerService" },
      );

      const result = await this.instrumentListSync.syncAll();

      this.logger.log(
        `[CRON] Instrument list sync complete: ${result.totalUpserted} upserted, ${result.totalDeactivated} deactivated`,
      );

      await this.processingLogRepo.logInfo(
        "CRON",
        "INSTRUMENT_LIST_SYNC",
        "Completed",
        {
          service: "SchedulerService",
          recordsProcessed: result.totalUpserted,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Instrument list sync failed: ${msg}`);
      await this.processingLogRepo.logError(
        "CRON",
        "INSTRUMENT_LIST_SYNC",
        msg,
        { service: "SchedulerService", errorCode: "CRON_LIST_SYNC_FAILED" },
      );
    }
  }

  private async runInstrumentDetailSync(): Promise<void> {
    this.logger.log("[CRON] Instrument detail sync starting");
    try {
      await this.processingLogRepo.logInfo(
        "CRON",
        "INSTRUMENT_DETAIL_SYNC",
        "Started",
        { service: "SchedulerService" },
      );

      const results = await this.instrumentSync.syncAll();

      let totalAdded = 0;
      for (const result of results.values()) {
        totalAdded += result.instrumentsAdded;
      }

      this.logger.log(
        `[CRON] Instrument detail sync complete: ${totalAdded} instruments added`,
      );

      await this.processingLogRepo.logInfo(
        "CRON",
        "INSTRUMENT_DETAIL_SYNC",
        "Completed",
        { service: "SchedulerService", recordsProcessed: totalAdded },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Instrument detail sync failed: ${msg}`);
      await this.processingLogRepo.logError(
        "CRON",
        "INSTRUMENT_DETAIL_SYNC",
        msg,
        {
          service: "SchedulerService",
          errorCode: "CRON_DETAIL_SYNC_FAILED",
        },
      );
    }
  }

  private async runNightlyBackfill(lookbackDays: number): Promise<void> {
    this.logger.log(
      `[CRON] Nightly backfill starting (lookback: ${lookbackDays} days)`,
    );
    try {
      await this.processingLogRepo.logInfo(
        "CRON",
        "NIGHTLY_BACKFILL",
        "Started",
        { service: "SchedulerService" },
      );

      const result =
        await this.historicalBackfill.backfillIncremental(lookbackDays);

      this.logger.log(
        `[CRON] Nightly backfill complete: ${result.instrumentsProcessed} instruments, ${result.totalCandlesFetched} candles`,
      );

      await this.processingLogRepo.logInfo(
        "CRON",
        "NIGHTLY_BACKFILL",
        "Completed",
        {
          service: "SchedulerService",
          recordsProcessed: result.totalCandlesFetched,
          durationMs: result.durationMs,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Nightly backfill failed: ${msg}`);
      await this.processingLogRepo.logError(
        "CRON",
        "NIGHTLY_BACKFILL",
        msg,
        { service: "SchedulerService", errorCode: "CRON_BACKFILL_FAILED" },
      );
    }
  }

  private async runPreMarketGlobal(): Promise<void> {
    this.logger.log("[CRON] Pre-market global data sync starting");
    try {
      await this.processingLogRepo.logInfo(
        "CRON",
        "PRE_MARKET_GLOBAL",
        "Started",
        { service: "SchedulerService" },
      );

      const result = await this.globalData.fetchOvernightData();

      this.logger.log(
        `[CRON] Pre-market global complete: ${result.symbolsFetched} symbols, ${result.totalCandles} candles`,
      );

      await this.processingLogRepo.logInfo(
        "CRON",
        "PRE_MARKET_GLOBAL",
        "Completed",
        {
          service: "SchedulerService",
          recordsProcessed: result.totalCandles,
          durationMs: result.durationMs,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] Pre-market global failed: ${msg}`);
      await this.processingLogRepo.logError(
        "CRON",
        "PRE_MARKET_GLOBAL",
        msg,
        { service: "SchedulerService", errorCode: "CRON_GLOBAL_FAILED" },
      );
    }
  }

  private async runEodReconciliation(): Promise<void> {
    this.logger.log("[CRON] EOD reconciliation starting");
    try {
      await this.processingLogRepo.logInfo(
        "CRON",
        "EOD_RECONCILIATION",
        "Started",
        { service: "SchedulerService" },
      );

      const result = await this.historicalBackfill.backfillIncremental(1);

      this.logger.log(
        `[CRON] EOD reconciliation complete: ${result.totalCandlesFetched} candles backfilled`,
      );

      await this.processingLogRepo.logInfo(
        "CRON",
        "EOD_RECONCILIATION",
        "Completed",
        {
          service: "SchedulerService",
          recordsProcessed: result.totalCandlesFetched,
          durationMs: result.durationMs,
        },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CRON] EOD reconciliation failed: ${msg}`);
      await this.processingLogRepo.logError(
        "CRON",
        "EOD_RECONCILIATION",
        msg,
        { service: "SchedulerService", errorCode: "CRON_EOD_FAILED" },
      );
    }
  }

  private async runStartupBackfill(): Promise<void> {
    this.logger.log("[STARTUP] Running full backfill of all missing data");
    try {
      const globalConfig = await this.dbConfig.getGlobalDataConfig();

      if (globalConfig.yahooFinanceEnabled) {
        this.logger.log("[STARTUP] Backfilling all global data...");
        const globalStart = new Date("2020-01-01");
        const now = new Date();
        await this.globalData.backfillGlobalData(globalStart, now);
      }

      this.logger.log("[STARTUP] Running full Indian market backfill...");
      await this.historicalBackfill.backfillAll();

      this.logger.log("[STARTUP] Startup backfill complete");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[STARTUP] Backfill failed: ${msg}`);
    }
  }
}
