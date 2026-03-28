import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OrderIntent } from './strategy-selector.service';

const RISK_KEY = 'algo:risk:state';

@Injectable()
export class RiskValidatorService implements OnModuleInit {
  private readonly logger = new Logger(RiskValidatorService.name);
  private readonly redis: Redis;

  private readonly MAX_DAILY_LOSS: number;
  private readonly MAX_POSITIONS: number;
  private readonly MAX_CONCENTRATION: number;
  private readonly FREEZE_LIMIT: number;

  constructor(private readonly configService: ConfigService) {
    this.MAX_DAILY_LOSS = this.configService.get<number>('MAX_DAILY_LOSS') ?? -50000;
    this.MAX_POSITIONS = this.configService.get<number>('MAX_POSITIONS') ?? 5;
    this.MAX_CONCENTRATION = this.configService.get<number>('MAX_CONCENTRATION_PCT') ?? 40;
    this.FREEZE_LIMIT = 50 * 36;
    this.redis = new Redis(this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
  }

  async onModuleInit() {
    const exists = await this.redis.exists(RISK_KEY);
    if (!exists) {
      await this.resetDailyState();
    }
    this.logger.log('Risk validator initialized (Redis-backed state)');
  }

  async validatePreTrade(intent: OrderIntent): Promise<boolean> {
    this.logger.debug(`Validating pre-trade risk for ${intent.side} ${intent.quantity} ${intent.instrumentKey}`);

    const state = await this.getRiskState();

    if (state.dailyPnl <= this.MAX_DAILY_LOSS) {
      this.logger.warn(`RISK REJECT: Max daily loss breached (${state.dailyPnl} <= ${this.MAX_DAILY_LOSS}). Trading halted.`);
      return false;
    }

    if (state.openPositions >= this.MAX_POSITIONS) {
      this.logger.warn(`RISK REJECT: Max open positions reached (${state.openPositions}/${this.MAX_POSITIONS}).`);
      return false;
    }

    if (intent.quantity > this.FREEZE_LIMIT) {
      this.logger.warn(`RISK REJECT: Fat finger check. Quantity ${intent.quantity} exceeds ${this.FREEZE_LIMIT} freeze limit.`);
      return false;
    }

    const instrumentExposure = state.instrumentExposure?.[intent.instrumentKey] ?? 0;
    const totalExposure = Object.values(state.instrumentExposure ?? {}).reduce((a: number, b: number) => a + b, 0) || 1;
    const concentrationPct = (instrumentExposure / totalExposure) * 100;
    if (concentrationPct > this.MAX_CONCENTRATION) {
      this.logger.warn(`RISK REJECT: Concentration limit. ${intent.instrumentKey} at ${concentrationPct.toFixed(1)}% > ${this.MAX_CONCENTRATION}%.`);
      return false;
    }

    return true;
  }

  async updateRiskState(pnl: number, positionsCount: number, instrumentExposure?: Record<string, number>) {
    const state: Record<string, string> = {
      dailyPnl: String(pnl),
      openPositions: String(positionsCount),
      lastUpdated: new Date().toISOString(),
    };
    if (instrumentExposure) {
      state.instrumentExposure = JSON.stringify(instrumentExposure);
    }
    await this.redis.hmset(RISK_KEY, state);
  }

  async resetDailyState() {
    await this.redis.hmset(RISK_KEY, {
      dailyPnl: '0',
      openPositions: '0',
      instrumentExposure: '{}',
      lastUpdated: new Date().toISOString(),
    });
    this.logger.log('Daily risk state reset');
  }

  private async getRiskState(): Promise<{
    dailyPnl: number;
    openPositions: number;
    instrumentExposure: Record<string, number>;
  }> {
    const raw = await this.redis.hgetall(RISK_KEY);
    return {
      dailyPnl: parseFloat(raw.dailyPnl || '0'),
      openPositions: parseInt(raw.openPositions || '0', 10),
      instrumentExposure: raw.instrumentExposure ? JSON.parse(raw.instrumentExposure) : {},
    };
  }
}
