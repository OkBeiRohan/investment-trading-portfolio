/**
 * Strike Selector Bootstrap Service
 * Auto-runs strike selection on app startup when AUTO_BOOTSTRAP_STRIKE_SELECTOR=true
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StrikeSelectorService } from './strike-selector.service';
import { StrikeSelectorConfig } from './strike-selector.types';

@Injectable()
export class StrikeSelectorBootstrap implements OnModuleInit {
  private readonly logger = new Logger(StrikeSelectorBootstrap.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly strikeSelectorService: StrikeSelectorService,
  ) {}

  async onModuleInit(): Promise<void> {
    const autoBootstrap = this.configService.get<string>(
      'AUTO_BOOTSTRAP_STRIKE_SELECTOR',
    );

    if (autoBootstrap !== 'true') {
      this.logger.log(
        'Auto-bootstrap disabled. Set AUTO_BOOTSTRAP_STRIKE_SELECTOR=true to enable.',
      );
      return;
    }

    this.logger.log(
      '🚀 Auto-bootstrapping strike selector for nearest expiry...',
    );

    try {
      // Build config from environment variables
      const config: Partial<StrikeSelectorConfig> = {
        expectedMove: parseFloat(
          this.configService.get<string>('EXPECTED_MOVE', '50'),
        ),
        holdingPeriodDays: parseFloat(
          this.configService.get<string>('HOLDING_PERIOD_DAYS', '1'),
        ),
        optionType:
          (this.configService.get<string>('OPTION_TYPE', 'BOTH') as
            | 'CE'
            | 'PE'
            | 'BOTH') || 'BOTH',
        maxRiskPercent: parseFloat(
          this.configService.get<string>('MAX_RISK_PERCENT', '0.05'),
        ),
        minDelta: parseFloat(
          this.configService.get<string>('MIN_DELTA', '0.05'),
        ),
        maxDelta: parseFloat(
          this.configService.get<string>('MAX_DELTA', '0.95'),
        ),
        minOpenInterest: parseInt(
          this.configService.get<string>('MIN_OI', '1000'),
          10,
        ),
        topN: parseInt(this.configService.get<string>('TOP_N', '10'), 10),
      };

      // Get optional expiry date from env (otherwise uses nearest)
      const expiryDate = this.configService.get<string>('EXPIRY_DATE');

      // Run dual-direction analysis (shows both bullish and bearish scenarios)
      const dualAnalysis =
        await this.strikeSelectorService.analyzeDualDirection(
          config.expectedMove || 50,
          config.holdingPeriodDays || 1,
          expiryDate,
        );

      // Print formatted dual-direction analysis
      const formattedOutput =
        this.strikeSelectorService.formatDualDirectionAnalysis(dualAnalysis);
      console.log(formattedOutput);

      // Output JSON if enabled
      if (this.configService.get<string>('OUTPUT_JSON') === 'true') {
        console.log('\n📊 JSON Output:');
        console.log(JSON.stringify(dualAnalysis, null, 2));
      }

      this.logger.log('✅ Strike selection bootstrap complete');
    } catch (error) {
      this.logger.error(
        `❌ Strike selection bootstrap failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Don't throw - allow app to continue running
    }
  }
}
