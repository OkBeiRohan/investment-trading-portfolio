import { Injectable } from "@nestjs/common";
import * as talib from "talib";

@Injectable()
export class TechnicalIndicatorsService {
  /**
   * Calculate all technical indicators for training
   */
  async calculateFeatures(candles: Candle[]): Promise<FeatureSnapshot> {
    const close = candles.map((c) => c.close);
    const high = candles.map((c) => c.high);
    const low = candles.map((c) => c.low);
    const volume = candles.map((c) => c.volume);

    return {
      // Realized Volatility (multiple windows)
      realizedVol5d: this.realizedVolatility(close, 5),
      realizedVol10d: this.realizedVolatility(close, 10),
      realizedVol20d: this.realizedVolatility(close, 20),

      // Momentum
      rsi14: talib.RSI(close, { optInTimePeriod: 14 }),

      // MACD
      macd: talib.MACD(close, {
        optInFastPeriod: 12,
        optInSlowPeriod: 26,
        optInSignalPeriod: 9,
      }),

      // Moving Averages
      sma20: talib.SMA(close, { optInTimePeriod: 20 }),
      sma50: talib.SMA(close, { optInTimePeriod: 50 }),
      ema20: talib.EMA(close, { optInTimePeriod: 20 }),

      // Volatility
      bbands: talib.BBANDS(close, {
        optInTimePeriod: 20,
        optInNbDevUp: 2,
        optInNbDevDn: 2,
      }),

      // Volume
      obv: talib.OBV(close, volume),
      adx: talib.ADX(high, low, close, { optInTimePeriod: 14 }),

      // Sentiment (requires market-wide data)
      indiaVix: await this.getVIXLevel(),
      pcrVolume: await this.getPCR("volume"),
      pcrOI: await this.getPCR("oi"),
      maxPain: await this.calculateMaxPain(),

      // Options (Greeks from Upstox)
      atmIV: await this.getATMImpliedVolatility(),
      volSkew: await this.calculateVolatilitySkew(),
      termStructure: await this.calculateTermStructure(),
    };
  }

  private realizedVolatility(prices: number[], window: number): number {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const recent = returns.slice(-window);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance =
      recent.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / recent.length;

    return Math.sqrt(variance * 252); // Annualized
  }
}
