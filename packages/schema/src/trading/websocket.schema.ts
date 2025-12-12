/**
 * WebSocket Stream Schemas
 * Schemas for real-time market data and portfolio updates via WebSocket
 */

import { z } from "zod";
import { optionGreeksSchema } from "./market-data.schema";

// ============================================
// Market Data Stream Enums & Types
// ============================================

export const marketDataModeEnum = z.enum([
  "ltpc", // Last Traded Price
  "full", // Full market data with depth
  "option_greeks", // Option greeks
  "full_d30", // Full with 30-day depth
]);

export type MarketDataMode = z.infer<typeof marketDataModeEnum>;

// ============================================
// Market Data Feed Schema
// ============================================

export const marketDataFeedSchema = z.object({
  instrumentKey: z.string(),
  mode: marketDataModeEnum,
  lastPrice: z.number().optional(),
  lastQuantity: z.number().optional(),
  lastTradeTime: z.date().optional(),
  ohlc: z
    .object({
      open: z.number(),
      high: z.number(),
      low: z.number(),
      close: z.number(),
    })
    .optional(),
  bidPrice: z.number().optional(),
  bidQuantity: z.number().optional(),
  askPrice: z.number().optional(),
  askQuantity: z.number().optional(),
  volume: z.number().optional(),
  totalBuyQuantity: z.number().optional(),
  totalSellQuantity: z.number().optional(),
  averagePrice: z.number().optional(),
  openInterest: z.number().optional(),
  netChange: z.number().optional(),
  depth: z
    .object({
      buy: z.array(
        z.object({
          price: z.number(),
          quantity: z.number(),
          orders: z.number(),
        })
      ),
      sell: z.array(
        z.object({
          price: z.number(),
          quantity: z.number(),
          orders: z.number(),
        })
      ),
    })
    .optional(),
  greeks: optionGreeksSchema.optional(),
});

export type MarketDataFeed = z.infer<typeof marketDataFeedSchema>;

// ============================================
// Portfolio Stream Feed Schema
// ============================================

export const portfolioStreamFeedSchema = z.object({
  type: z.enum(["order", "position", "holding", "trade"]),
  data: z.any(),
  timestamp: z.date(),
});

export type PortfolioStreamFeed = z.infer<typeof portfolioStreamFeedSchema>;

// ============================================
// WebSocket Configuration Schema
// ============================================

export const webSocketConfigSchema = z.object({
  reconnect: z.boolean().default(true),
  reconnectInterval: z.number().default(5000), // milliseconds
  maxReconnectAttempts: z.number().default(10),
  heartbeatInterval: z.number().optional(),
  timeout: z.number().optional(),
});

export type WebSocketConfig = z.infer<typeof webSocketConfigSchema>;

// ============================================
// WebSocket Message Schemas
// ============================================

export const wsConnectionStatusSchema = z.enum([
  "connecting",
  "connected",
  "disconnected",
  "reconnecting",
  "error",
]);

export type WSConnectionStatus = z.infer<typeof wsConnectionStatusSchema>;

export const wsSubscriptionRequestSchema = z.object({
  mode: marketDataModeEnum,
  instrumentKeys: z.array(z.string()),
});

export type WSSubscriptionRequest = z.infer<typeof wsSubscriptionRequestSchema>;

export const wsUnsubscriptionRequestSchema = z.object({
  instrumentKeys: z.array(z.string()),
});

export type WSUnsubscriptionRequest = z.infer<
  typeof wsUnsubscriptionRequestSchema
>;
