import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { DbConfigService, ProcessingLogRepository } from "@repo/database";
import { MarketCalendarService } from "@repo/market-sdk";
import { InstrumentSyncService } from "./instrument-sync.service";
import { InstrumentListSyncService } from "./instrument-list-sync.service";
import { HistoricalBackfillService } from "./historical-backfill.service";
import { GlobalDataService } from "./global-data.service";
import { LiveDataService } from "./live-data.service";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly dbConfig: DbConfigService,
    private readonly marketCalendar: MarketCalendarService,
    private readonly instrumentSync: InstrumentSyncService,
    private readonly instrumentListSync: InstrumentListSyncService,
    private readonly historicalBackfill: HistoricalBackfillService,
    private readonly globalData: GlobalDataService,
    private readonly liveData: LiveDataService,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerDynamicCrons();
    await this.handleStartupTasks();
  }

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

  private async handleStartupTasks(): Promise<void> {
    const isOpen = await this.marketCalendar.isMarketCurrentlyOpen("NSE");

    if (!isOpen) {
      this.logger.log(
        "Market is currently closed — running startup backfill",
      );
      try {
        await this.runInstrumentListSync();
        await this.runStartupBackfill();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Startup backfill failed: ${msg}`);
      }
    } else {
      this.logger.log(
        "Market is open — skipping heavy backfill, ready for live data",
      );
    }
  }

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
