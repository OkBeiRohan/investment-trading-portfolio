/**
 * Generic Broker Enums
 * Platform-agnostic enums for broker integrations
 */

/**
 * Trading Exchanges
 * Normalized exchange identifiers across all brokers
 */
export enum BrokerExchange {
  /** National Stock Exchange - Equity */
  NSE_EQUITY = "NSE_EQUITY",
  /** National Stock Exchange - Futures & Options */
  NSE_FO = "NSE_FO",
  /** Bombay Stock Exchange - Equity */
  BSE_EQUITY = "BSE_EQUITY",
  /** BSE - Futures & Options */
  BSE_FO = "BSE_FO",
  /** Currency Derivatives Segment */
  CURRENCY_DERIVATIVES = "CURRENCY_DERIVATIVES",
  /** BSE Currency Derivatives */
  BSE_CURRENCY = "BSE_CURRENCY",
  /** Multi Commodity Exchange */
  MCX_COMMODITY = "MCX_COMMODITY",
  /** NSE Commodity Derivatives */
  NSE_COMMODITY = "NSE_COMMODITY",
}

/**
 * Trading Segments
 * The four primary market segments in Indian financial markets.
 * Used to control which segments a user/account is enabled for.
 */
export enum BrokerSegment {
  /** Equity - Cash market (NSE EQ / BSE EQ) */
  EQ = "EQ",
  /** Futures & Options - F&O segment (NSE FO) */
  FO = "FO",
  /** Commodity - MCX commodity futures (MCX_FO) */
  COM = "COM",
  /** Currency Derivatives - NSE CD segment */
  CD = "CD",
}

/**
 * Product Types
 * Normalized product/order variety types across all brokers
 */
export enum BrokerProduct {
  /** Delivery - Cash & Carry (take delivery of shares) */
  DELIVERY = "DELIVERY",
  /** Intraday - Square off by end of day */
  INTRADAY = "INTRADAY",
  /** Cover Order - Intraday with mandatory stop loss */
  COVER_ORDER = "COVER_ORDER",
  /** Margin Trading Facility - Leverage on delivery trades */
  MARGIN = "MARGIN",
  /** Bracket Order - OCO (One Cancels Other) */
  BRACKET_ORDER = "BRACKET_ORDER",
}

/**
 * Order Types
 * Normalized order types across all brokers
 */
export enum BrokerOrderType {
  /** Market Order - Execute immediately at current market price */
  MARKET = "MARKET",
  /** Limit Order - Execute only at specified price or better */
  LIMIT = "LIMIT",
  /** Stop Loss - Trigger order when price hits stop loss */
  STOP_LOSS = "STOP_LOSS",
  /** Stop Loss Market - Market order triggered at stop loss price */
  STOP_LOSS_MARKET = "STOP_LOSS_MARKET",
  /** After Market Order - Order placed after market hours */
  AMO = "AMO",
}
