/**
 * Portfolio and Position Types
 */

import { ProductType, TransactionType } from "./common.types";

export interface Position {
  instrumentKey: string;
  tradingSymbol: string;
  exchange: string;
  product: ProductType;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  closePrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercentage: number;
  buyQuantity: number;
  buyAmount: number;
  buyAverage: number;
  sellQuantity: number;
  sellAmount: number;
  sellAverage: number;
  multiplier: number;
  overnightQuantity?: number;
  dayBuyQuantity?: number;
  daySellQuantity?: number;
}

export interface Holding {
  instrumentKey: string;
  tradingSymbol: string;
  exchange: string;
  isin: string;
  quantity: number;
  t1Quantity: number;
  averagePrice: number;
  lastPrice: number;
  closePrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercentage: number;
  collateralQuantity?: number;
  collateralType?: string;
}

export interface Funds {
  availableMargin: number;
  usedMargin: number;
  cashBalance: number;
  collateralMargin: number;
  intradayPayin: number;
  adhocMargin: number;
  notionalCash: number;
}

export interface PortfolioSummary {
  totalPnl: number;
  totalInvestment: number;
  totalValue: number;
  dayPnl: number;
  dayPnlPercentage: number;
  positions: Position[];
  holdings: Holding[];
  funds: Funds;
}
