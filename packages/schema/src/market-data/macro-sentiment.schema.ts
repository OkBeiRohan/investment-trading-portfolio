/**
 * Macro Sentiment Schema - v1.0
 * NLP-processed news sentiment and global macro events
 *
 * Used by:
 * - Tier 0: Pre-Market Gap Predictor (overnight news impact)
 * - Tier 1: Macro Director (daily sentiment regime)
 * - Feature engineering: Rolling sentiment averages as model features
 *
 * Source: FinBERT NLP processing of RSS feeds from
 * Reuters, Bloomberg, Moneycontrol, ET Markets, etc.
 */

import { z } from "zod";

// ============================================
// Event types for macro sentiment classification
// ============================================

export const MacroEventType = {
  NEWS: "NEWS",
  RATE_DECISION: "RATE_DECISION",
  GEOPOLITICAL: "GEOPOLITICAL",
  EARNINGS: "EARNINGS",
  ECONOMIC_DATA: "ECONOMIC_DATA",
  POLICY: "POLICY",
  COMMODITY_SUPPLY: "COMMODITY_SUPPLY",
  CURRENCY: "CURRENCY",
} as const;

export type MacroEventType = (typeof MacroEventType)[keyof typeof MacroEventType];

// ============================================
// News/Sentiment sources
// ============================================

export const SentimentSource = {
  REUTERS: "REUTERS",
  BLOOMBERG: "BLOOMBERG",
  MONEYCONTROL: "MONEYCONTROL",
  ET_MARKETS: "ET_MARKETS",
  CNBC: "CNBC",
  RSS_GENERIC: "RSS_GENERIC",
  TWITTER: "TWITTER",
  FINNHUB: "FINNHUB",
} as const;

export type SentimentSource = (typeof SentimentSource)[keyof typeof SentimentSource];

// ============================================
// TABLE: macro_sentiment
// ============================================

export const MacroSentimentSchema = z.object({
  timestamp: z.date(),
  entity: z.string(), // e.g., 'RBI', 'BRENT_CRUDE', 'FED', 'NIFTY50', 'HDFC_BANK'
  eventType: z.enum([
    "NEWS",
    "RATE_DECISION",
    "GEOPOLITICAL",
    "EARNINGS",
    "ECONOMIC_DATA",
    "POLICY",
    "COMMODITY_SUPPLY",
    "CURRENCY",
  ]),
  sentimentScore: z.number().min(-1).max(1), // -1.0 (Bearish) to 1.0 (Bullish)
  impactScore: z.number().min(0).max(1), // 0.0 to 1.0 (significance)
  headline: z.string().optional(), // Raw headline text
  source: z.enum([
    "REUTERS",
    "BLOOMBERG",
    "MONEYCONTROL",
    "ET_MARKETS",
    "CNBC",
    "RSS_GENERIC",
    "TWITTER",
    "FINNHUB",
  ]),
});

export type MacroSentiment = z.infer<typeof MacroSentimentSchema>;

// ============================================
// Aggregated sentiment (for feature engineering)
// ============================================

export const AggregatedSentimentSchema = z.object({
  entity: z.string(),
  sentimentMa1h: z.number(), // 1-hour rolling sentiment average
  sentimentMa24h: z.number(), // 24-hour rolling sentiment average
  impactWeightedSentiment: z.number(), // Impact-weighted sentiment
  newsCount1h: z.number().int(), // Number of news items in last hour
  newsCount24h: z.number().int(), // Number of news items in last 24h
  maxImpact24h: z.number(), // Highest impact event in 24h
  lastUpdated: z.date(),
});

export type AggregatedSentiment = z.infer<typeof AggregatedSentimentSchema>;
