import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  SystemConfigRepository,
  type SeedConfigItem,
} from "../repositories/trading/system-config.repository";

export interface SchedulerConfig {
  nightlyBackfill: {
    enabled: boolean;
    cronExpression: string;
    lookbackDays: number;
  };
  intradayFetch: {
    enabled: boolean;
    cronExpression: string;
  };
  instrumentListSync: {
    enabled: boolean;
    cronExpression: string;
  };
  instrumentDetailSync: {
    enabled: boolean;
    cronExpression: string;
  };
  preMarketGlobal: {
    enabled: boolean;
    cronExpression: string;
  };
  eodReconciliation: {
    enabled: boolean;
    cronExpression: string;
  };
  dailyReAuth: {
    enabled: boolean;
    cronExpression: string;
  };
}

export interface IngestionConfig {
  maxExpiredFutures: number;
  maxOptions: number;
  maxExpiries: number;
  concurrency: number;
  maxRetries: number;
  batchSize: number;
  batchFlushIntervalMs: number;
}

export interface WebSocketConfig {
  enabled: boolean;
  reconnectInterval: number;
  bufferFlushInterval: number;
  maxBufferSize: number;
}

export interface GlobalDataConfig {
  yahooFinanceEnabled: boolean;
  alphaVantageEnabled: boolean;
  finnhubEnabled: boolean;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  emailProvider: string;
  pushEnabled: boolean;
  dailyReAuthTemplateSubject: string;
  dailyReAuthTemplateBody: string;
}

export interface TradingDefaultsConfig {
  maxDailyLoss: number;
  maxPositions: number;
  maxOrderSize: number;
  maxDrawdownPercent: number;
  maxLeverageMultiple: number;
  defaultSegments: string[];
}

export interface MarketConfig {
  nseMarketOpenTime: string;
  nseMarketCloseTime: string;
  mcxMarketOpenTime: string;
  mcxMarketCloseTime: string;
  timezone: string;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  nightlyBackfill: {
    enabled: true,
    cronExpression: "0 30 18 * * 1-5",
    lookbackDays: 7,
  },
  intradayFetch: {
    enabled: true,
    cronExpression: "*/5 3-10 * * 1-5",
  },
  instrumentListSync: {
    enabled: true,
    cronExpression: "0 30 2 * * *",
  },
  instrumentDetailSync: {
    enabled: true,
    cronExpression: "0 45 2 * * 1-5",
  },
  preMarketGlobal: {
    enabled: true,
    cronExpression: "0 38 3 * * 1-5",
  },
  eodReconciliation: {
    enabled: true,
    cronExpression: "0 30 10 * * 1-5",
  },
  dailyReAuth: {
    enabled: true,
    cronExpression: "0 0 3 * * 1-5",
  },
};

const DEFAULT_INGESTION_CONFIG: IngestionConfig = {
  maxExpiredFutures: 100,
  maxOptions: 200,
  maxExpiries: 52,
  concurrency: 5,
  maxRetries: 3,
  batchSize: 100,
  batchFlushIntervalMs: 1000,
};

const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  enabled: true,
  reconnectInterval: 5000,
  bufferFlushInterval: 1000,
  maxBufferSize: 5000,
};

const DEFAULT_GLOBAL_DATA_CONFIG: GlobalDataConfig = {
  yahooFinanceEnabled: true,
  alphaVantageEnabled: false,
  finnhubEnabled: false,
};

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  emailEnabled: false,
  emailProvider: "smtp",
  pushEnabled: false,
  dailyReAuthTemplateSubject:
    "Action Required: Authenticate for today's trading session",
  dailyReAuthTemplateBody:
    "Hi {{name}}, please authenticate your Upstox account for today's trading session. Click here: {{reAuthUrl}}",
};

const DEFAULT_TRADING_DEFAULTS: TradingDefaultsConfig = {
  maxDailyLoss: 50000,
  maxPositions: 10,
  maxOrderSize: 1800,
  maxDrawdownPercent: 5,
  maxLeverageMultiple: 1,
  defaultSegments: ["fno"],
};

const DEFAULT_MARKET_CONFIG: MarketConfig = {
  nseMarketOpenTime: "09:15",
  nseMarketCloseTime: "15:30",
  mcxMarketOpenTime: "09:00",
  mcxMarketCloseTime: "23:30",
  timezone: "Asia/Kolkata",
};

@Injectable()
export class DbConfigService implements OnModuleInit {
  private readonly logger = new Logger(DbConfigService.name);

  constructor(private readonly systemConfigRepo: SystemConfigRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  async getSchedulerConfig(): Promise<SchedulerConfig> {
    return this.systemConfigRepo.getTyped<SchedulerConfig>(
      "scheduler",
      DEFAULT_SCHEDULER_CONFIG,
    );
  }

  async getIngestionConfig(): Promise<IngestionConfig> {
    return this.systemConfigRepo.getTyped<IngestionConfig>(
      "ingestion",
      DEFAULT_INGESTION_CONFIG,
    );
  }

  async getWebSocketConfig(): Promise<WebSocketConfig> {
    return this.systemConfigRepo.getTyped<WebSocketConfig>(
      "websocket",
      DEFAULT_WEBSOCKET_CONFIG,
    );
  }

  async getGlobalDataConfig(): Promise<GlobalDataConfig> {
    return this.systemConfigRepo.getTyped<GlobalDataConfig>(
      "globalData",
      DEFAULT_GLOBAL_DATA_CONFIG,
    );
  }

  async getNotificationConfig(): Promise<NotificationConfig> {
    return this.systemConfigRepo.getTyped<NotificationConfig>(
      "notification",
      DEFAULT_NOTIFICATION_CONFIG,
    );
  }

  async getTradingDefaultsConfig(): Promise<TradingDefaultsConfig> {
    return this.systemConfigRepo.getTyped<TradingDefaultsConfig>(
      "tradingDefaults",
      DEFAULT_TRADING_DEFAULTS,
    );
  }

  async getMarketConfig(): Promise<MarketConfig> {
    return this.systemConfigRepo.getTyped<MarketConfig>(
      "market",
      DEFAULT_MARKET_CONFIG,
    );
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    return this.systemConfigRepo.getTyped<T>(key, defaultValue);
  }

  private async seedDefaults(): Promise<void> {
    const seeds: SeedConfigItem[] = [
      {
        key: "scheduler",
        value: DEFAULT_SCHEDULER_CONFIG,
        category: "market",
        description: "Scheduler cron expressions and enable flags",
        valueType: "json",
      },
      {
        key: "ingestion",
        value: DEFAULT_INGESTION_CONFIG,
        category: "data",
        description: "Ingestion parameters (batch size, concurrency, etc.)",
        valueType: "json",
      },
      {
        key: "websocket",
        value: DEFAULT_WEBSOCKET_CONFIG,
        category: "data",
        description: "WebSocket connection configuration",
        valueType: "json",
      },
      {
        key: "globalData",
        value: DEFAULT_GLOBAL_DATA_CONFIG,
        category: "data",
        description: "Global data provider enable flags",
        valueType: "json",
      },
      {
        key: "notification",
        value: DEFAULT_NOTIFICATION_CONFIG,
        category: "notification",
        description: "Notification channels and templates",
        valueType: "json",
      },
      {
        key: "tradingDefaults",
        value: DEFAULT_TRADING_DEFAULTS,
        category: "trading",
        description: "Default trading risk limits and segment config",
        valueType: "json",
      },
      {
        key: "market",
        value: DEFAULT_MARKET_CONFIG,
        category: "market",
        description: "Market hours and timezone configuration",
        valueType: "json",
      },
    ];

    const inserted = await this.systemConfigRepo.bulkUpsert(seeds);
    if (inserted > 0) {
      this.logger.log(`Seeded ${inserted} default system configs`);
    }
  }
}
