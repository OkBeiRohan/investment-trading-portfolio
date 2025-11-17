/**
 * Common types for Market SDK
 */

export interface ApiConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  accessToken?: string;
}

export interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  errors?: ApiError[];
}

export interface ApiError {
  errorCode: string;
  message: string;
  propertyPath?: string;
  invalidValue?: any;
}

export enum Exchange {
  NSE_EQ = "NSE_EQ",
  NSE_FO = "NSE_FO",
  BSE_EQ = "BSE_EQ",
  BSE_FO = "BSE_FO",
  MCX_FO = "MCX_FO",
  NSE_CD = "NSE_CD",
  BSE_CD = "BSE_CD",
  NSE_INDEX = "NSE_INDEX",
}

export enum ProductType {
  INTRADAY = "I",
  DELIVERY = "D",
  CARRYFORWARD = "CNC",
  MARGIN_INTRADAY = "MTF",
}

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
}

export enum OrderType {
  MARKET = "MARKET",
  LIMIT = "LIMIT",
  STOP_LOSS = "SL",
  STOP_LOSS_MARKET = "SL-M",
}

export enum Validity {
  DAY = "DAY",
  IOC = "IOC", // Immediate or Cancel
}

export enum OrderStatus {
  PENDING = "pending",
  OPEN = "open",
  COMPLETE = "complete",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  TRIGGER_PENDING = "trigger pending",
}
