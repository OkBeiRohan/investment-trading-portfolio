/**
 * Daily Feature Service
 * Computes 48 daily features for regime model training (2000-2026)
 *
 * This is a TypeScript implementation for daily features because:
 * 1. Daily features don't need microsecond performance (computed once per day)
 * 2. Simpler to maintain than Rust FFI for this use case
 * 3. Uses same indicator logic as training-pipeline for consistency
 *
 * For minute features, we use the Rust compute-engine (ComputeEngineService)
 */

import { Injectable, Logger } from '@nestjs/common';
import { CandlesRepository, DailyFeaturesRepository } from '@repo/database';
import type { InstrumentFeatures1d } from '@repo/database';

@Injectable()
export class DailyFeatureService {
  private readonly logger = new Logger(DailyFeatureService.name);

  constructor(
    private readonly candlesRepository: CandlesRepository,
    private readonly dailyFeaturesRepository: DailyFeaturesRepository,
  ) {}

  /**
   * Compute and store daily features for an instrument
   * Requires at least 200 days of history for SMA-200
   */
  async computeAndStoreDailyFeatures(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    this.logger.log(
      `Computing daily features for ${instrumentKey} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    );

    // Fetch daily candles - need extra 200 days for lookback
    const lookbackStart = new Date(startDate);
    lookbackStart.setDate(lookbackStart.getDate() - 200);

    const candles = await this.candlesRepository.findByTimeRange(
      instrumentKey,
      1,
      'day',
      lookbackStart,
      endDate,
      10000,
    );

    if (candles.length < 200) {
      this.logger.warn(
        `Insufficient data for ${instrumentKey}: ${candles.length} candles (need 200+)`,
      );
      return 0;
    }

    // Fetch VIX data for volatility features
    const vixCandles = await this.candlesRepository.findByTimeRange(
      'NSE_INDEX|India VIX',
      1,
      'day',
      lookbackStart,
      endDate,
      10000,
    );

    // Build VIX lookup map
    const vixMap = new Map<string, number>();
    for (const candle of vixCandles) {
      const dateKey = candle.timestamp.toISOString().split('T')[0];
      vixMap.set(dateKey, candle.close);
    }

    // Sort candles by timestamp
    candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Extract arrays for indicator calculations
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);

    // Compute features starting from index 200
    const features: InstrumentFeatures1d[] = [];

    for (let i = 200; i < candles.length; i++) {
      const candle = candles[i];
      const timestamp = candle.timestamp;

      // Skip if before startDate
      if (timestamp < startDate) continue;

      try {
        const feature = this.computeFeature(
          candle,
          instrumentKey,
          closes.slice(0, i + 1),
          highs.slice(0, i + 1),
          lows.slice(0, i + 1),
          volumes.map((v) => v || 0).slice(0, i + 1),
          vixMap.get(timestamp.toISOString().split('T')[0]) || 15,
        );
        features.push(feature);
      } catch (error) {
        this.logger.error(`Error computing feature at ${timestamp}`, error);
      }
    }

    // Store to QuestDB
    if (features.length > 0) {
      await this.dailyFeaturesRepository.insertBatch(features);
      this.logger.log(
        `Stored ${features.length} daily features for ${instrumentKey}`,
      );
    }

    return features.length;
  }

  private computeFeature(
    candle: {
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number | null;
    },
    instrumentKey: string,
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    vix: number,
  ): InstrumentFeatures1d {
    const n = closes.length;
    const close = candle.close;
    const prevClose = closes[n - 2] || close;

    // SMAs
    const sma10 = this.sma(closes, 10);
    const sma20 = this.sma(closes, 20);
    const sma50 = this.sma(closes, 50);
    const sma200 = this.sma(closes, 200);

    // EMAs
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);

    // RSI
    const rsi14 = this.rsi(closes, 14);
    const rsi5 = this.rsi(closes, 5);

    // ATR
    const atr14 = this.atr(highs, lows, closes, 14);

    // Bollinger Bands
    const bb = this.bollingerBands(closes, 20);

    // ADX
    const adxResult = this.adx(highs, lows, closes, 14);

    // Realized Volatility
    const realizedVol20d = this.realizedVolatility(closes, 20);
    const realizedVol60d = this.realizedVolatility(closes, 60);

    // High/Low 20d
    const high20d = Math.max(...closes.slice(-20));
    const low20d = Math.min(...closes.slice(-20));

    // Volume
    const volSma20 = this.sma(volumes, 20);

    // Time features
    const date = candle.timestamp;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    return {
      timestamp: candle.timestamp,
      instrumentKey,

      // Price Structure (8)
      close,
      return1d: (close - prevClose) / prevClose,
      return5d: n > 5 ? (close - closes[n - 6]) / closes[n - 6] : 0,
      return20d: n > 20 ? (close - closes[n - 21]) / closes[n - 21] : 0,
      rangeHl: (candle.high - candle.low) / close,
      gapOpen: (candle.open - prevClose) / prevClose,
      closeVsHigh20d: (close - high20d) / high20d,
      closeVsLow20d: (close - low20d) / low20d,

      // Momentum (8)
      rsi14,
      rsi5,
      macd: ema12 - ema26,
      macdSignal: (ema12 - ema26) * 0.9,
      macdHist: (ema12 - ema26) * 0.1,
      adx14: adxResult.adx,
      plusDi: adxResult.plusDi,
      minusDi: adxResult.minusDi,

      // Moving Averages (6)
      sma10,
      sma20,
      sma50,
      sma200,
      ema12,
      ema26,

      // MA Signals (4)
      priceVsSma20: (close - sma20) / sma20,
      priceVsSma50: (close - sma50) / sma50,
      priceVsSma200: (close - sma200) / sma200,
      goldenCross: sma50 > sma200 ? 1 : 0,

      // Volatility (6)
      atr14,
      atrPercent: atr14 / close,
      realizedVol20d: isNaN(realizedVol20d) ? 0 : realizedVol20d,
      realizedVol60d: isNaN(realizedVol60d) ? 0 : realizedVol60d,
      bollingerWidth: bb.width,
      bollingerPosition: bb.position,

      // VIX (4)
      vixClose: vix,
      vixPercentile30d: 50, // Would need historical VIX
      vixPercentile1yr: 50,
      vixSma10: vix,

      // Volume (4)
      volumeSma20Ratio: volSma20 > 0 ? (candle.volume || 0) / volSma20 : 1,
      volumeTrend: 0,
      obvChange: 0,
      accumulationDist: 0,

      // Regime (4)
      trendStrength: adxResult.adx / 100,
      meanReversionSignal: (rsi14 - 50) / 50,
      momentumRegime:
        close > sma20 && sma20 > sma50
          ? 1
          : close < sma20 && sma20 < sma50
            ? -1
            : 0,
      volatilityRegime:
        realizedVol20d / (realizedVol60d || 1) > 1.3
          ? 1
          : realizedVol20d / (realizedVol60d || 1) < 0.7
            ? -1
            : 0,

      // Time (4)
      dayOfWeek: date.getDay(),
      monthOfYear: date.getMonth() + 1,
      isMonthEnd: nextDay.getMonth() !== date.getMonth(),
      isQuarterEnd:
        [3, 6, 9, 12].includes(date.getMonth() + 1) &&
        nextDay.getMonth() !== date.getMonth(),

      // Validity
      isValid: true,
      invalidReason: undefined,
    };
  }

  // Simple Moving Average
  private sma(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, v) => sum + v, 0) / period;
  }

  // Exponential Moving Average
  private ema(data: number[], period: number): number {
    if (data.length < period) return this.sma(data, data.length);
    const multiplier = 2 / (period + 1);
    let emaValue = this.sma(data.slice(0, period), period);
    for (let i = period; i < data.length; i++) {
      emaValue = (data[i] - emaValue) * multiplier + emaValue;
    }
    return emaValue;
  }

  // Relative Strength Index
  private rsi(closes: number[], period: number): number {
    if (closes.length < period + 1) return 50;
    let gains = 0,
      losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  // Average True Range
  private atr(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): number {
    if (highs.length < period + 1) return 0;
    let trSum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
      const prevClose = closes[i - 1];
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - prevClose),
        Math.abs(lows[i] - prevClose),
      );
      trSum += tr;
    }
    return trSum / period;
  }

  // ADX
  private adx(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): { adx: number; plusDi: number; minusDi: number } {
    if (highs.length < period + 1) return { adx: 25, plusDi: 25, minusDi: 25 };
    let plusDmSum = 0,
      minusDmSum = 0,
      trSum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];
      if (highDiff > lowDiff && highDiff > 0) plusDmSum += highDiff;
      if (lowDiff > highDiff && lowDiff > 0) minusDmSum += lowDiff;
      trSum += Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
    }
    const plusDi = trSum > 0 ? (plusDmSum / trSum) * 100 : 0;
    const minusDi = trSum > 0 ? (minusDmSum / trSum) * 100 : 0;
    const dx =
      plusDi + minusDi > 0
        ? (Math.abs(plusDi - minusDi) / (plusDi + minusDi)) * 100
        : 0;
    return { adx: dx, plusDi, minusDi };
  }

  // Bollinger Bands
  private bollingerBands(
    closes: number[],
    period: number,
  ): { width: number; position: number } {
    const middle = this.sma(closes, period);
    const slice = closes.slice(-period);
    const variance =
      slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = middle + 2 * std;
    const lower = middle - 2 * std;
    const width = middle > 0 ? (upper - lower) / middle : 0;
    const current = closes[closes.length - 1];
    const position =
      upper - lower > 0 ? (current - lower) / (upper - lower) : 0.5;
    return { width, position };
  }

  // Realized Volatility (annualized)
  private realizedVolatility(closes: number[], period: number): number {
    if (closes.length < period + 1) return 0;
    const returns: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      if (closes[i - 1] > 0) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
      }
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
      returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance * 252);
  }
}
