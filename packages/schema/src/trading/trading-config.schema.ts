export interface IRiskLimits {
  maxDailyLoss: number;
  maxPositions: number;
  maxOrderSize: number;
  maxDrawdownPercent: number;
  maxLeverageMultiple: number;
}

export interface ISegmentConfig {
  equity: boolean;
  fno: boolean;
  mcx: boolean;
  currency: boolean;
}

export interface ITradingConfig {
  userId: string;
  organizationId?: string;
  enabled: boolean;
  sandboxMode: boolean;
  dailyReAuthRequired: boolean;
  lastReAuthAt?: Date;
  reAuthExpiresAt?: Date;
  segments: ISegmentConfig;
  riskLimits: IRiskLimits;
  allowedInstruments: string[];
  blockedInstruments: string[];
  strategyConfig: Record<string, unknown>;
  autoStartTrading: boolean;
  tradingStartTime: string;
  tradingEndTime: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
