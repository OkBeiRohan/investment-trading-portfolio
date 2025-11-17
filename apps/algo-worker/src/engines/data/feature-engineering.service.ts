/**
 * FeatureEngineeringService
 * Pure TypeScript feature calculations
 * Reusable for both training and inference
 */

import { Injectable, Logger } from '@nestjs/common';
import { type Features, type MACD, type FeatureSnapshot } from '@repo/schema';

interface MarketData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class FeatureEngineeringService {
  private readonly logger = new Logger(FeatureEngineeringService.name);

  /**
   * Compute all features from market data
   */
  computeFeatures(
    data: MarketData[],
    optionChain?: any,
    vixData?: number[],
  ): Features {
    return {
      // Underlying features
      realizedVol5d: this.calculateRealizedVolatility(data, 5),
      realizedVol10d: this.calculateRealizedVolatility(data, 10),
      realizedVol20d: this.calculateRealizedVolatility(data, 20),
      rsi14: this.calculateRSI(data, 14),
      macd: this.calculateMACD(data, 12, 26, 9),

      // Sentiment features
      indiaVix: vixData?.[vixData.length - 1],
      indiaVixMA5: vixData ? this.calculateSMA(vixData, 5) : undefined,
      pcrVolume: optionChain?.pcrVolume,
      pcrOI: optionChain?.pcrOI,
      maxPain: optionChain?.maxPain,

      // Options features
      atmIV: optionChain?.atmIV,
      volSkew: optionChain?.volSkew,
      termStructure: optionChain?.termStructure,
    };
  }

  /**
   * Calculate Realized Volatility
   * Uses close-to-close returns
   */
  private calculateRealizedVolatility(
    data: MarketData[],
    window: number,
  ): number | undefined {
    if (data.length < window + 1) return undefined;

    const returns = [];
    for (let i = 1; i <= window; i++) {
      const ret = Math.log(
        data[data.length - i].close / data[data.length - i - 1].close,
      );
      returns.push(ret);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      (returns.length - 1);
    const vol = Math.sqrt(variance * 252); // Annualized

    return vol;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(data: MarketData[], period: number): number | undefined {
    if (data.length < period + 1) return undefined;

    const changes = [];
    for (let i = data.length - period; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? Math.abs(c) : 0));

    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate MACD
   */
  private calculateMACD(
    data: MarketData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number,
  ): MACD | undefined {
    if (data.length < slowPeriod + signalPeriod) return undefined;

    const closes = data.map((d) => d.close);

    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    const macdLine = fastEMA - slowEMA;

    // For signal line, we'd need to calculate EMA of MACD values
    // Simplified here
    const signal = macdLine * 0.9; // Placeholder
    const histogram = macdLine - signal;

    return {
      value: macdLine,
      signal,
      histogram,
    };
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(values: number[], period: number): number {
    const multiplier = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(values: number[], period: number): number | undefined {
    if (values.length < period) return undefined;

    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Validate feature quality
   * Check for NaN, Infinity, missing values
   */
  validateFeatures(features: Features): {
    isValid: boolean;
    missingFields: string[];
    quality: 'good' | 'filled' | 'anomalous';
  } {
    const missingFields: string[] = [];
    let anomalousCount = 0;

    for (const [key, value] of Object.entries(features)) {
      if (value === undefined || value === null) {
        missingFields.push(key);
      } else if (typeof value === 'number') {
        if (!isFinite(value)) {
          anomalousCount++;
        }
      }
    }

    const quality =
      anomalousCount > 0
        ? 'anomalous'
        : missingFields.length > 0
          ? 'filled'
          : 'good';

    return {
      isValid: anomalousCount === 0,
      missingFields,
      quality,
    };
  }
}
