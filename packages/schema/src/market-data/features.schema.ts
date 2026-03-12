import { z } from "zod";

/**
 * Market Data Point Schema
 * Raw market data for feature computation
 */
export const MarketDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  lastPrice: z.number(),
  volume: z.number(),
  openInterest: z.number().optional(),
  open: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  close: z.number().optional(),
  bidPrice: z.number().optional(),
  askPrice: z.number().optional(),
  bidQuantity: z.number().optional(),
  askQuantity: z.number().optional(),
  delta: z.number().optional(),
  gamma: z.number().optional(),
  vega: z.number().optional(),
  theta: z.number().optional(),
  impliedVolatility: z.number().optional(),
});

export type MarketDataPoint = z.infer<typeof MarketDataPointSchema>;

/**
 * Feature Vector Schema
 * Computed features for ML models (117 features total)
 */
export const FeatureVectorSchema = z.object({
  timestamp: z.string().datetime(),

  // Market Structure (8 features)
  priceVsVwap: z.number(),
  priceVsDayHigh: z.number(),
  priceVsDayLow: z.number(),
  rangePosition: z.number(),
  prevDayHighDist: z.number(),
  prevDayLowDist: z.number(),
  weeklyHighDist: z.number(),
  weeklyLowDist: z.number(),

  // Momentum & Trend (8 features)
  rsi5: z.number(),
  rsi14: z.number(),
  rsi21: z.number(),
  macdHist: z.number(),
  ema9Slope: z.number(),
  ema21Slope: z.number(),
  adx: z.number(),
  roc5: z.number(),

  // Volatility (5 features)
  atrPercent: z.number(),
  realizedVol5m: z.number(),
  realizedVol15m: z.number(),
  volExpansionRatio: z.number(),
  indiaVix: z.number(),

  // Options (9 features)
  atmIv: z.number(),
  atmIvChange: z.number(),
  deltaAtm: z.number(),
  gammaAtm: z.number(),
  vegaAtm: z.number(),
  thetaAtm: z.number(),
  pcrOi: z.number(),
  pcrVolume: z.number(),
  maxPainDist: z.number(),

  // Time Context (3 features)
  minutesFromOpen: z.number(),
  minutesToClose: z.number(),
  dayOfWeek: z.number(),
});

export type FeatureVector = z.infer<typeof FeatureVectorSchema>;
