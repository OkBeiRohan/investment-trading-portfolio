/**
 * Test Controller
 * Manual endpoint for testing the ML inference pipeline
 * POST /test/signal - Generate a test signal
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { SignalEngineService } from './engines/signal/signal-engine.service';

interface TestSignalRequest {
  userId?: string;
  features?: {
    realizedVol5d?: number;
    realizedVol10d?: number;
    realizedVol20d?: number;
    rsi14?: number;
    macdValue?: number;
    macdSignal?: number;
    macdHistogram?: number;
    sma20?: number;
    sma50?: number;
    ema12?: number;
    ema26?: number;
    indiaVix?: number;
    indiaVixMA5?: number;
    pcrVolume?: number;
    pcrOI?: number;
    maxPain?: number;
    atmIV?: number;
    volSkew?: number;
    termStructure?: number;
    callIVSpread?: number;
    putIVSpread?: number;
    hour?: number;
    dayOfWeek?: number;
    isMarketOpen?: number;
  };
}

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(private readonly signalEngine: SignalEngineService) {}

  /**
   * Generate a test trading signal
   * If no features provided, uses synthetic test data
   */
  @Post('signal')
  async generateTestSignal(@Body() request: TestSignalRequest) {
    this.logger.log('Test signal generation requested');

    const userId = request.userId || 'test-user';

    // Use provided features or generate synthetic test data
    const features = request.features || this.generateTestFeatures();

    try {
      // Generate signal (includes persistence)
      const signalId = await this.signalEngine.generateAndPersistSignal(
        features,
        userId,
      );

      return {
        success: true,
        signalId,
        message: 'Signal generated successfully',
        features,
      };
    } catch (error) {
      this.logger.error('Failed to generate test signal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate synthetic test features
   * Simulates realistic market conditions
   */
  private generateTestFeatures() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isMarketOpen =
      hour >= 9 && hour < 15 && dayOfWeek >= 1 && dayOfWeek <= 5 ? 1 : 0;

    return {
      // Volatility indicators (higher values = more volatile)
      realizedVol5d: 0.18 + Math.random() * 0.1,
      realizedVol10d: 0.16 + Math.random() * 0.08,
      realizedVol20d: 0.15 + Math.random() * 0.07,

      // Technical indicators
      rsi14: 30 + Math.random() * 40, // 30-70 range
      macdValue: -2 + Math.random() * 4, // -2 to 2
      macdSignal: -2 + Math.random() * 4,
      macdHistogram: -1 + Math.random() * 2,
      sma20: 19000 + Math.random() * 2000,
      sma50: 18500 + Math.random() * 2000,
      ema12: 19200 + Math.random() * 1500,
      ema26: 18800 + Math.random() * 1500,

      // Market sentiment
      indiaVix: 12 + Math.random() * 8, // 12-20 range
      indiaVixMA5: 13 + Math.random() * 7,
      pcrVolume: 0.8 + Math.random() * 0.6, // 0.8-1.4
      pcrOI: 0.9 + Math.random() * 0.5, // 0.9-1.4
      maxPain: 19000 + Math.random() * 1000,

      // Options metrics
      atmIV: 14 + Math.random() * 10, // 14-24
      volSkew: -2 + Math.random() * 4, // -2 to 2
      termStructure: 0.95 + Math.random() * 0.15, // 0.95-1.10
      callIVSpread: 1 + Math.random() * 3,
      putIVSpread: 1 + Math.random() * 3,

      // Time features
      hour,
      dayOfWeek,
      isMarketOpen,
    };
  }
}
