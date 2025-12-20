import IUpstoxResponse from "../general";

/**
 * Upstox Exchange Codes
 * Represents different exchanges enabled for the user account
 */
export enum UpstoxExchange {
  /** National Stock Exchange (Equity) */
  NSE = "NSE",
  /** National Stock Exchange Futures & Options */
  NFO = "NFO",
  /** Bombay Stock Exchange */
  BSE = "BSE",
  /** Currency Derivatives Segment */
  CDS = "CDS",
  /** BSE Futures & Options */
  BFO = "BFO",
  /** BSE Currency Derivatives */
  BCD = "BCD",
  /** Multi Commodity Exchange */
  MCX = "MCX",
  /** NSE Commodity Derivatives */
  NSCOM = "NSCOM",
}

/**
 * Upstox Product Types
 * Represents types of products enabled for the user
 */
export enum UpstoxProduct {
  /** Delivery (Cash & Carry) - Take delivery of shares */
  D = "D",
  /** Cover Order - Intraday with mandatory stop loss */
  CO = "CO",
  /** Intraday - Square off by end of day */
  I = "I",
  /** Margin Trading Facility - Leverage on delivery trades */
  MTF = "MTF",
}

/**
 * Upstox Order Types
 * Represents order types enabled for the user
 */
export enum UpstoxOrderType {
  /** Market Order - Execute immediately at current market price */
  MARKET = "MARKET",
  /** Limit Order - Execute only at specified price or better */
  LIMIT = "LIMIT",
  /** Stop Loss - Trigger market order when price hits stop loss */
  SL = "SL",
  /** Stop Loss Market - Trigger limit order when price hits stop loss */
  SL_M = "SL-M",
}

export interface IGetProfileUpstox {
  email: string;
  exchanges: UpstoxExchange[];
  products: UpstoxProduct[];
  broker: "UPSTOX";
  user_id: string;
  user_name: string;
  order_types: UpstoxOrderType[];
  user_type: "individual";
  /** Power of Attorney - User has authorized POA for transactions */
  poa: boolean;
  /** Demat Debit and Pledge Instruction - User has authorized DDPI */
  ddpi: boolean;
  /** Indicates if the account status is active */
  is_active: boolean;
}

type IGetProfileUpstoxResponse = IUpstoxResponse<IGetProfileUpstox>;
export default IGetProfileUpstoxResponse;
