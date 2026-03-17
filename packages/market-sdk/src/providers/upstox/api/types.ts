/**
 * Complete Upstox API Type Definitions
 * Covers all REST API endpoints from https://upstox.com/developer/api-documentation/
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface UpstoxApiResponse<T> {
  status: "success" | "error";
  data: T;
}

export interface UpstoxErrorResponse {
  status: "error";
  errors: Array<{
    errorCode: string;
    message: string;
    propertyPath: string;
    invalidValue: string;
    error_code: string;
  }>;
}

// ─── Login / Auth ────────────────────────────────────────────────────────────

export interface TokenResponse {
  email: string;
  exchanges: string[];
  products: string[];
  broker: string;
  user_id: string;
  user_name: string;
  order_types: string[];
  user_type: string;
  poa: boolean;
  is_active: boolean;
  access_token: string;
  extended_token?: string;
}

export interface TokenRequestResponse {
  authorization_expiry: string;
  notifier_url: string;
}

export interface TokenWebhookPayload {
  client_id: string;
  user_id: string;
  access_token: string;
  token_type: string;
  expires_at: string;
  issued_at: string;
  message_type: "access_token";
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  email: string;
  exchanges: string[];
  products: string[];
  broker: string;
  user_id: string;
  user_name: string;
  order_types: string[];
  user_type: string;
  poa: boolean;
  is_active: boolean;
}

export interface FundMarginData {
  used_margin: number;
  payin_amount: number;
  span_margin: number;
  adhoc_margin: number;
  notional_cash: number;
  available_margin: number;
  exposure_margin: number;
}

export interface FundsAndMargin {
  equity?: FundMarginData;
  commodity?: FundMarginData;
}

// ─── Charges ─────────────────────────────────────────────────────────────────

export interface BrokerageRequest {
  instrument_token: string;
  quantity: number;
  product: string;
  transaction_type: string;
  price: number;
}

export interface BrokerageDetails {
  total: number;
  brokerage: number;
  taxes: {
    gst: number;
    stt: number;
    stamp_duty: number;
  };
  charges: {
    transaction: number;
    clearing: number;
    ipft: number;
    sebi_turnover: number;
  };
  dp: number;
  otherCharges?: Record<string, number>;
}

// ─── Margins ─────────────────────────────────────────────────────────────────

export interface MarginRequest {
  instrument_token: string;
  quantity: number;
  product: string;
  transaction_type: string;
  price: number;
  trigger_price?: number;
  order_type: string;
}

export interface MarginDetails {
  span: number;
  exposure: number;
  total_margin: number;
  available_margin: number;
  additional_margin: number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "open"
  | "complete"
  | "cancelled"
  | "rejected"
  | "after market order req received"
  | "put order req received"
  | "modify validation pending"
  | "open pending"
  | "modify pending"
  | "cancel pending"
  | "trigger pending"
  | "not cancelled"
  | "not modified";

export type TransactionType = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M";
export type ProductType = "I" | "D" | "CO" | "MTF";
export type Validity = "DAY" | "IOC";
export type Variety = "SIMPLE" | "STOPLOSS" | "AMO";

export interface PlaceOrderRequest {
  quantity: number;
  product: ProductType;
  validity: Validity;
  price: number;
  tag?: string;
  instrument_token: string;
  order_type: OrderType;
  transaction_type: TransactionType;
  disclosed_quantity?: number;
  trigger_price?: number;
  is_amo?: boolean;
  slice?: boolean;
}

export interface PlaceOrderResponse {
  order_id: string;
  order_request_id?: string;
}

export interface PlaceMultiOrderRequest {
  orders: PlaceOrderRequest[];
}

export interface PlaceMultiOrderResponse {
  order_ids: Array<{
    order_id: string;
    status: string;
    status_message: string;
  }>;
}

export interface ModifyOrderRequest {
  order_id: string;
  quantity?: number;
  validity?: Validity;
  price?: number;
  order_type?: OrderType;
  disclosed_quantity?: number;
  trigger_price?: number;
}

export interface Order {
  exchange: string;
  product: ProductType;
  price: number;
  quantity: number;
  status: OrderStatus;
  tag?: string;
  instrument_token: string;
  instrument_key?: string;
  placed_by: string;
  trading_symbol: string;
  tradingsymbol?: string;
  order_type: OrderType;
  validity: Validity;
  trigger_price: number;
  disclosed_quantity: number;
  transaction_type: TransactionType;
  average_price: number;
  filled_quantity: number;
  pending_quantity: number;
  status_message?: string;
  status_message_raw?: string;
  exchange_order_id: string;
  parent_order_id?: string;
  order_id: string;
  variety: Variety;
  order_timestamp: string;
  exchange_timestamp?: string;
  is_amo: boolean;
  order_request_id?: string;
  order_ref_id?: string;
  guid?: string;
}

export interface Trade {
  exchange: string;
  product: ProductType;
  trading_symbol: string;
  tradingsymbol?: string;
  instrument_token: string;
  order_type: OrderType;
  transaction_type: TransactionType;
  quantity: number;
  exchange_order_id: string;
  order_id: string;
  exchange_timestamp: string;
  average_price: number;
  trade_id: string;
  order_ref_id?: string;
  order_timestamp?: string;
}

// ─── GTT Orders ──────────────────────────────────────────────────────────────

export type GttType = "SINGLE" | "OCO";

export interface GttRule {
  quantity: number;
  product: ProductType;
  transaction_type: TransactionType;
  order_type: OrderType;
  price: number;
  trigger_price: number;
}

export interface PlaceGttOrderRequest {
  type: GttType;
  instrument_token: string;
  rules: GttRule[];
  expires_at?: string;
}

export interface GttOrder {
  gtt_order_id: string;
  type: GttType;
  instrument_token: string;
  trading_symbol: string;
  exchange: string;
  status: string;
  rules: GttRule[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface Position {
  exchange: string;
  multiplier: number;
  value: number;
  pnl: number;
  product: ProductType;
  instrument_token: string;
  average_price: number;
  buy_value: number;
  overnight_quantity: number;
  day_buy_value: number;
  day_buy_price: number;
  overnight_buy_amount: number;
  overnight_buy_quantity: number;
  day_buy_quantity: number;
  day_sell_value: number;
  day_sell_price: number;
  overnight_sell_amount: number;
  overnight_sell_quantity: number;
  day_sell_quantity: number;
  quantity: number;
  last_price: number;
  unrealised: number;
  realised: number;
  sell_value: number;
  trading_symbol: string;
  tradingsymbol?: string;
  close_price: number;
  buy_price: number;
  sell_price: number;
}

export interface Holding {
  isin: string;
  cnc_used_quantity: number;
  collateral_type?: string;
  company_name: string;
  haircut: number;
  product: ProductType;
  quantity: number;
  trading_symbol: string;
  tradingsymbol?: string;
  last_price: number;
  close_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  instrument_token: string;
  average_price: number;
  collateral_quantity: number;
  collateral_update_quantity: number;
  t1_quantity: number;
  exchange: string;
}

export interface ConvertPositionRequest {
  instrument_token: string;
  new_product: ProductType;
  old_product: ProductType;
  transaction_type: TransactionType;
  quantity: number;
}

// ─── Trade Profit & Loss ─────────────────────────────────────────────────────

export interface PnlReportMetadata {
  trade_wise_charges_enabled: boolean;
  trades_count: number;
  pnl_summary: {
    realized_pnl: number;
    unrealized_pnl: number;
    total_pnl: number;
  };
}

export interface PnlReportEntry {
  exchange: string;
  segment: string;
  symbol: string;
  instrument_token: string;
  trade_type: string;
  quantity: number;
  buy_amount: number;
  sell_amount: number;
  pnl: number;
  charges?: number;
}

export interface TradeCharges {
  trade_id: string;
  brokerage: number;
  taxes: number;
  charges: number;
  total: number;
}

// ─── Market Quote ────────────────────────────────────────────────────────────

export interface MarketQuoteFull {
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  depth: {
    buy: Array<{ price: number; quantity: number; orders: number }>;
    sell: Array<{ price: number; quantity: number; orders: number }>;
  };
  timestamp: string;
  instrument_token: string;
  symbol: string;
  last_price: number;
  volume: number;
  average_price: number;
  oi: number;
  net_change: number;
  total_buy_quantity: number;
  total_sell_quantity: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  last_trade_time?: string;
  oi_day_high?: number;
  oi_day_low?: number;
}

export interface OhlcQuote {
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  last_price: number;
  instrument_token: string;
  timestamp?: string;
}

export interface LtpQuote {
  last_price: number;
  instrument_token: string;
  timestamp?: string;
}

export interface OptionGreek {
  instrument_token: string;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

// ─── Market Information ──────────────────────────────────────────────────────

export interface MarketHolidayEntry {
  date: string;
  description: string;
  holiday_type: "TRADING_HOLIDAY" | "SETTLEMENT_HOLIDAY" | "SPECIAL_TIMING";
  closed_exchanges: string[];
  open_exchanges: Array<{
    exchange: string;
    start_time: number;
    end_time: number;
  }>;
}

export interface MarketTiming {
  exchange: string;
  start_time: number;
  end_time: number;
}

export interface ExchangeStatus {
  exchange: string;
  status: "open" | "closed" | "pre_open" | "pre_close";
  message?: string;
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

export interface WebSocketAuthResponse {
  authorized_redirect_uri: string;
}

export interface PortfolioStreamUpdate {
  update_type: "order" | "position" | "holding";
  user_id: string;
  [key: string]: unknown;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface OrderWebhookPayload {
  update_type: "order";
  user_id: string;
  exchange: string;
  instrument_token: string;
  instrument_key: string;
  trading_symbol: string;
  product: ProductType;
  order_type: OrderType;
  average_price: number;
  price: number;
  trigger_price: number;
  quantity: number;
  disclosed_quantity: number;
  pending_quantity: number;
  transaction_type: TransactionType;
  order_ref_id: string;
  exchange_order_id: string;
  parent_order_id: string | null;
  validity: Validity;
  status: OrderStatus;
  is_amo: boolean;
  variety: Variety;
  tag: string | null;
  exchange_timestamp: string | null;
  status_message: string;
  order_id: string;
  order_request_id: string;
  order_timestamp: string;
  filled_quantity: number;
  guid: string | null;
  placed_by: string;
  status_message_raw: string | null;
}

export interface GttWebhookPayload {
  update_type: "gtt_order";
  user_id: string;
  gtt_order_id: string;
  status: string;
  instrument_token: string;
  trading_symbol: string;
  exchange: string;
  type: GttType;
  triggered_at?: string;
  child_orders?: Array<{
    order_id: string;
    status: string;
  }>;
}
