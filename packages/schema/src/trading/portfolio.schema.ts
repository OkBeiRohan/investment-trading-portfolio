/**
 * Portfolio and Position Schemas
 * Comprehensive schemas for holdings, positions, funds, and portfolio summary
 */

import { z } from "zod";
import { ExchangeEnum, ProductTypeEnum, TransactionTypeEnum } from "./index";

// ============================================
// Position Schema (Trading Position)
// ============================================

export const tradingPositionSchema = z.object({
  instrumentKey: z.string(),
  tradingSymbol: z.string(),
  exchange: ExchangeEnum,
  product: ProductTypeEnum,
  quantity: z.number(),
  averagePrice: z.number(),
  lastPrice: z.number(),
  closePrice: z.number(),
  pnl: z.number(),
  dayChange: z.number(),
  dayChangePercentage: z.number(),
  buyQuantity: z.number(),
  buyAmount: z.number(),
  buyAverage: z.number(),
  sellQuantity: z.number(),
  sellAmount: z.number(),
  sellAverage: z.number(),
  multiplier: z.number(),
  overnightQuantity: z.number().optional(),
  dayBuyQuantity: z.number().optional(),
  daySellQuantity: z.number().optional(),
});

export type TradingPosition = z.infer<typeof tradingPositionSchema>;

// ============================================
// Holding Schema
// ============================================

export const holdingSchema = z.object({
  instrumentKey: z.string(),
  tradingSymbol: z.string(),
  exchange: ExchangeEnum,
  isin: z.string(),
  quantity: z.number(),
  t1Quantity: z.number(),
  averagePrice: z.number(),
  lastPrice: z.number(),
  closePrice: z.number(),
  pnl: z.number(),
  dayChange: z.number(),
  dayChangePercentage: z.number(),
  collateralQuantity: z.number().optional(),
  collateralType: z.string().optional(),
});

export type Holding = z.infer<typeof holdingSchema>;

// ============================================
// Funds Schema
// ============================================

export const fundsSchema = z.object({
  availableMargin: z.number(),
  usedMargin: z.number(),
  cashBalance: z.number(),
  collateralMargin: z.number(),
  intradayPayin: z.number(),
  adhocMargin: z.number(),
  notionalCash: z.number(),
});

export type Funds = z.infer<typeof fundsSchema>;

// ============================================
// Portfolio Summary Schema
// ============================================

export const portfolioSummarySchema = z.object({
  totalPnl: z.number(),
  totalInvestment: z.number(),
  totalValue: z.number(),
  dayPnl: z.number(),
  dayPnlPercentage: z.number(),
  positions: z.array(tradingPositionSchema),
  holdings: z.array(holdingSchema),
  funds: fundsSchema,
});

export type PortfolioSummary = z.infer<typeof portfolioSummarySchema>;
