/**
 * Portfolio Provider Interface
 * Common interface for portfolio/position management across providers
 */

import type { Exchange } from "./market-data.interface";
import type { OptionGreeks } from "./market-data.interface";

// ============================================
// Portfolio Types
// ============================================

export interface Position {
  instrumentKey: string;
  instrument: string;
  exchange: Exchange;
  product: "INTRADAY" | "DELIVERY" | "CARRYFORWARD";
  quantity: number;
  buyQuantity: number;
  sellQuantity: number;
  buyValue: number;
  sellValue: number;
  buyPrice: number;
  sellPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  dayPnl: number;
  dayPnlPercentage: number;
}

export interface Holding {
  instrumentKey: string;
  instrument: string;
  exchange: Exchange;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  dayPnl: number;
  dayPnlPercentage: number;
  collateralQuantity?: number;
  collateralType?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  investedValue: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dayPnl: number;
  dayPnlPercentage: number;
  cashBalance: number;
  usedMargin: number;
  availableMargin: number;
}

export interface MarginRequirement {
  instrumentKey: string;
  exchange: Exchange;
  orderType: "MARKET" | "LIMIT";
  quantity: number;
  price?: number;
  requiredMargin: number;
  availableMargin: number;
  additionalMarginRequired: number;
}

export interface PositionGreeks {
  instrumentKey: string;
  quantity: number;
  greeks: OptionGreeks;
  totalDelta: number;
  totalGamma: number;
  totalVega: number;
  totalTheta: number;
  totalRho?: number;
}

// ============================================
// Portfolio Provider Interface
// ============================================

export interface IPortfolioProvider {
  /**
   * Provider identification
   */
  readonly providerId: string;
  readonly providerName: string;
  readonly supportedExchanges: Exchange[];

  /**
   * Initialize the provider with credentials
   */
  initialize(config: Record<string, unknown>): Promise<void>;

  /**
   * Get current positions (intraday)
   */
  getPositions(): Promise<Position[]>;

  /**
   * Get holdings (delivery/long-term)
   */
  getHoldings(): Promise<Holding[]>;

  /**
   * Get portfolio summary with P&L
   */
  getPortfolioSummary(): Promise<PortfolioSummary>;

  /**
   * Get margin requirements for an order
   */
  getMarginRequirement(
    instrumentKey: string,
    quantity: number,
    orderType: "MARKET" | "LIMIT",
    price?: number
  ): Promise<MarginRequirement>;

  /**
   * Get portfolio Greeks (for options positions)
   */
  getPortfolioGreeks?(): Promise<PositionGreeks[]>;

  /**
   * Convert position (e.g., intraday to delivery)
   */
  convertPosition?(
    instrumentKey: string,
    quantity: number,
    fromProduct: "INTRADAY" | "DELIVERY",
    toProduct: "INTRADAY" | "DELIVERY"
  ): Promise<{ success: boolean; message?: string }>;

  /**
   * Subscribe to portfolio updates
   */
  subscribePortfolioUpdates?(): Promise<PortfolioUpdateStream>;

  /**
   * Unsubscribe from portfolio updates
   */
  unsubscribePortfolioUpdates?(): Promise<void>;

  /**
   * Check if provider is initialized and ready
   */
  isReady(): boolean;

  /**
   * Clean up resources
   */
  disconnect(): Promise<void>;
}

// ============================================
// Portfolio Update Stream Interface
// ============================================

export interface PortfolioUpdateEvent {
  type: "position_update" | "holding_update" | "balance_update";
  timestamp: Date;
  data: Position | Holding | PortfolioSummary;
}

export interface PortfolioUpdateStream {
  on(event: "data", listener: (data: PortfolioUpdateEvent) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "close", listener: () => void): void;
  off(
    event: "data" | "error" | "close",
    listener: (...args: any[]) => void
  ): void;
  close(): Promise<void>;
}
