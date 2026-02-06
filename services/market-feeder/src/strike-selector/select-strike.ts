#!/usr/bin/env ts-node
/**
 * Strike Selector CLI
 *
 * Institutional-grade option strike selection tool.
 *
 * Usage:
 *   npx ts-node src/strike-selector/select-strike.ts
 *
 * Environment Variables:
 *   UPSTOX_ACCESS_TOKEN     - Required: Upstox API access token
 *   STRIKE_SELECTOR_ENABLED - Optional: Set to 'true' to enable (default: false)
 *   EXPECTED_MOVE           - Required: Expected Nifty move in points (e.g., 50, -100)
 *   HOLDING_PERIOD_DAYS     - Optional: Holding period (default: 1)
 *   OPTION_TYPE             - Optional: CE, PE, or BOTH (default: BOTH)
 *   MAX_RISK_PERCENT        - Optional: Max capital per trade (default: 0.05 = 5%)
 *   EXPIRY_DATE             - Optional: Specific expiry (YYYY-MM-DD), else nearest
 *   DEFAULT_BALANCE         - Optional: Override balance if API fails (default: 50000)
 *   MIN_DELTA               - Optional: Minimum delta (default: 0.05)
 *   MAX_DELTA               - Optional: Maximum delta (default: 0.95)
 *   MIN_OI                  - Optional: Minimum open interest (default: 1000)
 *   TOP_N                   - Optional: Number of top strikes to show (default: 10)
 *
 * Example:
 *   EXPECTED_MOVE=50 OPTION_TYPE=CE npx ts-node src/strike-selector/select-strike.ts
 */

import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@repo/database';
import { StrikeSelectorService } from './strike-selector.service';
import { UpstoxClient } from '../historical-data/upstox-client';
import { StrikeSelectorConfig } from './strike-selector.types';

// Create a minimal module for CLI execution
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        baseURL: 'https://api.upstox.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${configService.get<string>('UPSTOX_ACCESS_TOKEN', '')}`,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule.forMarketFeeder(),
  ],
  providers: [UpstoxClient, StrikeSelectorService],
})
class StrikeSelectorCliModule {}

async function main() {
  const logger = new Logger('StrikeSelectorCLI');

  // Check if enabled
  if (process.env.STRIKE_SELECTOR_ENABLED !== 'true') {
    logger.warn(
      'Strike selector is disabled. Set STRIKE_SELECTOR_ENABLED=true to enable.',
    );
    logger.log('Running in dry-run mode with example output...\n');
    printUsage();
    return;
  }

  // Validate required env vars
  if (!process.env.UPSTOX_ACCESS_TOKEN) {
    logger.error('UPSTOX_ACCESS_TOKEN is required');
    process.exit(1);
  }

  const expectedMove = parseFloat(process.env.EXPECTED_MOVE || '');
  if (isNaN(expectedMove)) {
    logger.error(
      'EXPECTED_MOVE is required (e.g., EXPECTED_MOVE=50 for bullish, EXPECTED_MOVE=-50 for bearish)',
    );
    process.exit(1);
  }

  // Parse config from env
  const config: Partial<StrikeSelectorConfig> = {
    expectedMove,
    holdingPeriodDays: parseFloat(process.env.HOLDING_PERIOD_DAYS || '1'),
    optionType: (process.env.OPTION_TYPE as 'CE' | 'PE' | 'BOTH') || 'BOTH',
    maxRiskPercent: parseFloat(process.env.MAX_RISK_PERCENT || '0.05'),
    minDelta: parseFloat(process.env.MIN_DELTA || '0.05'),
    maxDelta: parseFloat(process.env.MAX_DELTA || '0.95'),
    minOpenInterest: parseInt(process.env.MIN_OI || '1000', 10),
    topN: parseInt(process.env.TOP_N || '10', 10),
  };

  const expiryDate = process.env.EXPIRY_DATE;

  logger.log('🎯 Strike Selector - Starting Analysis');
  logger.log('════════════════════════════════════════');

  try {
    // Bootstrap NestJS app
    const app = await NestFactory.createApplicationContext(
      StrikeSelectorCliModule,
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    const service = app.get(StrikeSelectorService);

    // Run analysis
    const result = await service.selectOptimalStrike(config, expiryDate);

    // Print formatted result
    console.log(service.formatRecommendation(result));

    // Print JSON for programmatic use
    if (process.env.OUTPUT_JSON === 'true') {
      console.log('\n📊 JSON Output:');
      console.log(JSON.stringify(result, null, 2));
    }

    await app.close();
  } catch (error) {
    logger.error(
      `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    🎯 STRIKE SELECTOR - Usage Guide                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  This tool analyzes the Nifty 50 option chain and recommends the optimal  ║
║  strike based on the institutional RAROC utility function.                ║
║                                                                           ║
║  REQUIRED ENVIRONMENT VARIABLES:                                          ║
║  ────────────────────────────────────────────────────────────────────────║
║  STRIKE_SELECTOR_ENABLED=true     Enable the selector                     ║
║  EXPECTED_MOVE=<points>           Your expected Nifty move                ║
║                                   (+50 = bullish, -50 = bearish)          ║
║                                                                           ║
║  OPTIONAL ENVIRONMENT VARIABLES:                                          ║
║  ────────────────────────────────────────────────────────────────────────║
║  HOLDING_PERIOD_DAYS=1            Days to hold (0.5 = 12 hours)           ║
║  OPTION_TYPE=BOTH                 CE, PE, or BOTH                         ║
║  MAX_RISK_PERCENT=0.05            Max capital per trade (5%)              ║
║  EXPIRY_DATE=2024-01-25           Specific expiry (default: nearest)      ║
║  MIN_DELTA=0.05                   Filter very far OTM                     ║
║  MAX_DELTA=0.95                   Filter very deep ITM                    ║
║  MIN_OI=1000                      Minimum open interest                   ║
║  TOP_N=10                         Number of top strikes to show           ║
║  OUTPUT_JSON=true                 Also output JSON for parsing            ║
║  STRIKE_SELECTOR_DEFAULT_BALANCE  Override balance if API fails           ║
║                                                                           ║
║  EXAMPLES:                                                                ║
║  ────────────────────────────────────────────────────────────────────────║
║                                                                           ║
║  # Bullish view, expecting +50 point move, buy calls                      ║
║  STRIKE_SELECTOR_ENABLED=true EXPECTED_MOVE=50 OPTION_TYPE=CE \\           ║
║    npx ts-node src/strike-selector/select-strike.ts                       ║
║                                                                           ║
║  # Bearish view, expecting -100 point move, buy puts                      ║
║  STRIKE_SELECTOR_ENABLED=true EXPECTED_MOVE=-100 OPTION_TYPE=PE \\         ║
║    npx ts-node src/strike-selector/select-strike.ts                       ║
║                                                                           ║
║  # Intraday trade (6 hours), specific expiry                              ║
║  STRIKE_SELECTOR_ENABLED=true EXPECTED_MOVE=30 HOLDING_PERIOD_DAYS=0.25 \\║
║    EXPIRY_DATE=2024-01-25 npx ts-node src/strike-selector/select-strike.ts║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

  The utility function used is:

  U(S) = [(Δ × M) + (0.5 × Γ × M²) - (θ × H)] / [P × √(IV/100)] × [1 - Cap/Balance]

  Where:
  • Δ (Delta)  = Directional sensitivity
  • Γ (Gamma)  = Acceleration of delta  
  • θ (Theta)  = Time decay per day
  • M          = Expected market move
  • H          = Holding period in days
  • P          = Premium (LTP)
  • IV         = Implied Volatility
  • Cap        = Capital required for position
  • Balance    = Available trading balance

`);
}

// Run main
main().catch(console.error);
