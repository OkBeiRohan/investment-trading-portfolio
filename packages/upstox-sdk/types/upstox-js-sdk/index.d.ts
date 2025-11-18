/**
 * Type declarations for upstox-js-sdk
 * Based on upstox-js-sdk@2.21.0 and existing type models
 */

import { EventEmitter } from "events";

declare module "upstox-js-sdk" {
  import { EventEmitter } from "events";

  // ==================== API Client ====================
  export class ApiClient {
    constructor(sandbox?: boolean);
    static instance: ApiClient;
    basePath: string;
    authentications: {
      OAUTH2: {
        accessToken: string;
      };
    };
    defaultHeaders: Record<string, string>;
  }

  // ==================== Enums ====================
  export namespace PlaceOrderV3Request {
    export enum ProductEnum {
      D = "D",
      I = "I",
      M = "M",
      B = "B",
    }

    export enum ValidityEnum {
      DAY = "DAY",
      IOC = "IOC",
    }

    export enum OrderTypeEnum {
      MARKET = "MARKET",
      LIMIT = "LIMIT",
      SL = "SL",
      SL_M = "SL-M",
    }

    export enum TransactionTypeEnum {
      BUY = "BUY",
      SELL = "SELL",
    }
  }

  export namespace ModifyOrderRequest {
    export enum ValidityEnum {
      DAY = "DAY",
      IOC = "IOC",
    }

    export enum OrderTypeEnum {
      MARKET = "MARKET",
      LIMIT = "LIMIT",
      SL = "SL",
      SL_M = "SL-M",
    }
  }

  export namespace ConvertPositionRequest {
    export enum TransactionTypeEnum {
      BUY = "BUY",
      SELL = "SELL",
    }

    export enum ProductEnum {
      D = "D",
      I = "I",
    }

    export enum PreviousProductEnum {
      D = "D",
      I = "I",
    }
  }

  // ==================== Request/Response Models ====================
  export class PlaceOrderV3Request {
    constructor(
      quantity: number,
      product: PlaceOrderV3Request.ProductEnum,
      validity: PlaceOrderV3Request.ValidityEnum,
      price: number,
      instrument_token: string,
      order_type: PlaceOrderV3Request.OrderTypeEnum,
      transaction_type: PlaceOrderV3Request.TransactionTypeEnum,
      disclosed_quantity: number,
      trigger_price: number,
      is_amo: boolean
    );
    quantity: number;
    product: PlaceOrderV3Request.ProductEnum;
    validity: PlaceOrderV3Request.ValidityEnum;
    price: number;
    instrument_token: string;
    order_type: PlaceOrderV3Request.OrderTypeEnum;
    transaction_type: PlaceOrderV3Request.TransactionTypeEnum;
    disclosed_quantity: number;
    trigger_price: number;
    is_amo: boolean;
  }

  export class ModifyOrderRequest {
    constructor(
      quantity?: number,
      validity?: ModifyOrderRequest.ValidityEnum,
      price?: number,
      order_id?: string,
      order_type?: ModifyOrderRequest.OrderTypeEnum,
      disclosed_quantity?: number,
      trigger_price?: number
    );
    quantity?: number;
    validity?: ModifyOrderRequest.ValidityEnum;
    price?: number;
    order_id?: string;
    order_type?: ModifyOrderRequest.OrderTypeEnum;
    disclosed_quantity?: number;
    trigger_price?: number;
  }

  export class ConvertPositionRequest {
    constructor(
      instrument_token: string,
      new_product: ConvertPositionRequest.ProductEnum,
      old_product: ConvertPositionRequest.PreviousProductEnum,
      transaction_type: ConvertPositionRequest.TransactionTypeEnum,
      quantity: number
    );
    instrument_token: string;
    new_product: ConvertPositionRequest.ProductEnum;
    old_product: ConvertPositionRequest.PreviousProductEnum;
    transaction_type: ConvertPositionRequest.TransactionTypeEnum;
    quantity: number;
  }

  export class GttPlaceOrderRequest {
    condition: any;
    orders: any[];
    type: string;
  }

  export class GttModifyOrderRequest {
    id: string;
    condition: any;
    orders: any[];
  }

  export class GttCancelOrderRequest {
    id: string;
  }

  export class MarginRequest {
    instruments: Array<{
      instrument_token: string;
      quantity: number;
      transaction_type: string;
      product: string;
    }>;
  }

  export interface MultiOrderV3Data {
    order_ids?: string[];
  }

  export interface OrderMetadata {
    // Metadata for the order request
  }

  export interface PlaceOrderV3Response {
    status: "success" | "error" | "partial_success";
    data?: MultiOrderV3Data;
    metadata?: OrderMetadata;
    errors?: any;
  }

  export interface ModifyOrderData {
    order_id?: string;
  }

  export interface ModifyOrderV3Response {
    status: "success" | "error";
    data?: ModifyOrderData;
    metadata?: OrderMetadata;
    errors?: any;
  }

  export interface CancelOrderData {
    order_id?: string;
  }

  export interface CancelOrderV3Response {
    status: "success" | "error";
    data?: CancelOrderData;
    metadata?: OrderMetadata;
    errors?: any;
  }

  export interface GetOrderBookResponse {
    status: string;
    data?: Array<{
      exchange: string;
      price: number;
      product: string;
      quantity: number;
      status: string;
      instrument_token: string;
      placed_by: string;
      trading_symbol: string;
      order_type: string;
      validity: string;
      trigger_price: number;
      disclosed_quantity: number;
      transaction_type: string;
      average_price: number;
      filled_quantity: number;
      pending_quantity: number;
      status_message: string;
      order_id: string;
      order_request_id: string;
      order_timestamp: string;
      exchange_order_id: string;
      is_amo: boolean;
      exchange_timestamp: string;
      variety: string;
      guid: string;
      tag: string;
    }>;
  }

  export interface GetPositionResponse {
    status: string;
    data?: Array<{
      exchange: string;
      multiplier: number;
      pnl: number;
      buy_value: number;
      sell_value: number;
      close_price: number;
      buy_price: number;
      sell_price: number;
      overnight_quantity: number;
      quantity: number;
      last_price: number;
      unrealised: number;
      realised: number;
      sell_quantity: number;
      buy_quantity: number;
      instrument_token: string;
      average_price: number;
      trading_symbol: string;
      product: string;
      day_buy_quantity: number;
      day_buy_price: number;
      day_buy_value: number;
      day_sell_quantity: number;
      day_sell_price: number;
      day_sell_value: number;
    }>;
  }

  export interface GetHoldingsResponse {
    status: string;
    data?: Array<{
      isin: string;
      cnc_used_quantity: number;
      collateral_type: string;
      company_name: string;
      haircut: number;
      product: string;
      quantity: number;
      instrument_token: string;
      average_price: number;
      trading_symbol: string;
      close_price: number;
      pnl: number;
      day_change: number;
      day_change_percentage: number;
    }>;
  }

  export interface GetProfileResponse {
    status: string;
    data?: {
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
    };
  }

  export interface GetUserFundMarginResponse {
    status: string;
    data?: {
      commodity: {
        used_margin: number;
        payin_amount: number;
        span_margin: number;
        adhoc_margin: number;
        notional_cash: number;
        available_margin: number;
        exposure_margin: number;
      };
      equity: {
        used_margin: number;
        payin_amount: number;
        span_margin: number;
        adhoc_margin: number;
        notional_cash: number;
        available_margin: number;
        exposure_margin: number;
      };
    };
  }

  export interface GetFullMarketQuoteResponse {
    status: string;
    data?: Record<
      string,
      {
        ohlc: {
          open: number;
          high: number;
          low: number;
          close: number;
        };
        depth: {
          buy: Array<{
            quantity: number;
            price: number;
            orders: number;
          }>;
          sell: Array<{
            quantity: number;
            price: number;
            orders: number;
          }>;
        };
        timestamp: string;
        instrument_token: string;
        exchange_timestamp: string;
        last_price: number;
        last_quantity: number;
        buy_quantity: number;
        sell_quantity: number;
        volume: number;
        average_price: number;
        oi: number;
        net_change: number;
        total_buy_quantity: number;
        total_sell_quantity: number;
        lower_circuit_limit: number;
        upper_circuit_limit: number;
        last_trade_time: string;
        oi_day_high: number;
        oi_day_low: number;
      }
    >;
  }

  export interface GetMarketQuoteOHLCResponseV3 {
    status: string;
    data?: Record<
      string,
      {
        ohlc: {
          open: number;
          high: number;
          low: number;
          close: number;
        };
        last_price: number;
      }
    >;
  }

  export interface GetMarketQuoteLastTradedPriceResponseV3 {
    status: string;
    data?: Record<
      string,
      {
        last_price: number;
        instrument_token: string;
      }
    >;
  }

  export interface GetMarketQuoteOptionGreekResponseV3 {
    status: string;
    data?: Record<
      string,
      {
        vega: number;
        theta: number;
        gamma: number;
        delta: number;
        iv: number;
      }
    >;
  }

  export interface GetHistoricalCandleResponse {
    status: string;
    data?: {
      candles: Array<[string, number, number, number, number, number, number]>; // [timestamp, open, high, low, close, volume, oi]
    };
  }

  export interface GetOptionChainResponse {
    status: string;
    data?: Array<{
      expiry: string;
      pcr: number;
      strike_price: number;
      underlying_key: string;
      underlying_spot_price: number;
      call_options: {
        instrument_key: string;
        market_data: {
          ltp: number;
          volume: number;
          oi: number;
          close_price: number;
          bid_price: number;
          bid_qty: number;
          ask_price: number;
          ask_qty: number;
          prev_oi: number;
        };
        option_greeks: {
          vega: number;
          theta: number;
          gamma: number;
          delta: number;
          iv: number;
        };
      };
      put_options: {
        instrument_key: string;
        market_data: {
          ltp: number;
          volume: number;
          oi: number;
          close_price: number;
          bid_price: number;
          bid_qty: number;
          ask_price: number;
          ask_qty: number;
          prev_oi: number;
        };
        option_greeks: {
          vega: number;
          theta: number;
          gamma: number;
          delta: number;
          iv: number;
        };
      };
    }>;
  }

  export interface GetGttOrderResponse {
    status: string;
    data?: Array<{
      id: string;
      parent_id: string;
      user_id: string;
      trigger_type: string;
      created_at: string;
      updated_at: string;
      expires_at: string;
      status: string;
      condition: any;
      orders: any[];
      order_result: any;
    }>;
  }

  export interface GttOrderData {
    id?: string;
  }

  export interface GttTriggerOrderResponse {
    status: "success" | "error";
    data?: GttOrderData;
    metadata?: OrderMetadata;
    errors?: any;
  }

  export interface GetBrokerageResponse {
    status: string;
    data?: {
      charges: {
        transaction_charges: {
          total: number;
        };
        clearing_charges: {
          total: number;
        };
        stamp_duty: {
          total: number;
        };
        gst: {
          total: number;
        };
        sebi_turnover_charge: {
          total: number;
        };
        total: number;
      };
    };
  }

  export interface MarginData {
    type?: string;
    required_margin?: number;
  }

  export interface PostMarginResponse {
    status: "success" | "error";
    data?: MarginData;
    metadata?: OrderMetadata;
    errors?: any;
  }

  export interface GetMarketStatusResponse {
    status: string;
    data?: {
      exchange: string;
      status: string;
    };
  }

  export interface GetHolidayResponse {
    status: string;
    data?: Array<{
      date: string;
      description: string;
      holiday_type: string;
      closed_exchanges: string[];
      open_exchanges: string[];
    }>;
  }

  export interface GetExchangeTimingResponse {
    status: string;
    data?: Record<
      string,
      {
        trading_hours: string;
        closing_hour: string;
      }
    >;
  }

  export interface WebsocketAuthRedirectResponseData {
    authorized_redirect_uri?: string;
  }

  export interface WebsocketAuthRedirectResponse {
    status: "success" | "error";
    data?: WebsocketAuthRedirectResponseData;
    errors?: any;
  }

  export interface LogoutResponse {
    status: string;
  }

  export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
  }

  export interface GetTradeResponse {
    status: string;
    data?: Array<{
      exchange: string;
      product: string;
      trading_symbol: string;
      instrument_token: string;
      order_type: string;
      transaction_type: string;
      quantity: number;
      exchange_order_id: string;
      order_id: string;
      exchange_timestamp: string;
      average_price: number;
      trade_id: string;
      order_ref_id: string;
      order_timestamp: string;
    }>;
  }

  // ==================== API Classes ====================
  export class ChargeApi {
    constructor(apiClient?: ApiClient);
    getBrokerage(
      instrument_token: string,
      quantity: number,
      product: string,
      transaction_type: string,
      price: number,
      callback?: (error: any, data: GetBrokerageResponse, response: any) => void
    ): Promise<GetBrokerageResponse>;
    postMargin(
      body: MarginRequest,
      callback?: (error: any, data: PostMarginResponse, response: any) => void
    ): Promise<PostMarginResponse>;
  }

  export class ExpiredInstrumentApi {
    constructor(apiClient?: ApiClient);
    getExpiredFutureContracts(
      instrument_key: string,
      expiry_date: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getExpiredHistoricalCandleData(
      expired_instrument_key: string,
      interval: string,
      to_date: string,
      from_date: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getExpiredOptionContracts(
      instrument_key: string,
      expiry_date: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getExpiries(
      instrument_key: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
  }

  export class HistoryApi {
    constructor(apiClient?: ApiClient);
    getHistoricalCandleData2(
      instrumentKey: string,
      interval: string,
      to_date: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
    getHistoricalCandleData3(
      instrumentKey: string,
      interval: string,
      to_date: string,
      from_date: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
    getIntraDayCandleData1(
      instrumentKey: string,
      interval: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
  }

  export class HistoryV3Api {
    constructor(apiClient?: ApiClient);
    getHistoricalCandleData(
      instrumentKey: string,
      unit: string,
      interval: string,
      to_date: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
    getHistoricalCandleData1(
      instrumentKey: string,
      unit: string,
      interval: string,
      to_date: string,
      from_date: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
    getIntraDayCandleData(
      instrumentKey: string,
      unit: string,
      interval: string,
      callback?: (
        error: any,
        data: GetHistoricalCandleResponse,
        response: any
      ) => void
    ): Promise<GetHistoricalCandleResponse>;
  }

  export class LoginApi {
    constructor(apiClient?: ApiClient);
    authorize(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    initTokenRequestForIndieUser(
      client_id: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    logout(
      callback?: (error: any, data: LogoutResponse, response: any) => void
    ): Promise<LogoutResponse>;
    token(
      api_version?: string,
      code?: string,
      client_id?: string,
      client_secret?: string,
      redirect_uri?: string,
      grant_type?: string,
      callback?: (error: any, data: TokenResponse, response: any) => void
    ): Promise<TokenResponse>;
  }

  export class MarketHolidaysAndTimingsApi {
    constructor(apiClient?: ApiClient);
    getExchangeTimings(
      date: string,
      callback?: (
        error: any,
        data: GetExchangeTimingResponse,
        response: any
      ) => void
    ): Promise<GetExchangeTimingResponse>;
    getHoliday(
      date: string,
      callback?: (error: any, data: GetHolidayResponse, response: any) => void
    ): Promise<GetHolidayResponse>;
    getHolidays(
      callback?: (error: any, data: GetHolidayResponse, response: any) => void
    ): Promise<GetHolidayResponse>;
    getMarketStatus(
      exchange: string,
      callback?: (
        error: any,
        data: GetMarketStatusResponse,
        response: any
      ) => void
    ): Promise<GetMarketStatusResponse>;
  }

  export class MarketQuoteApi {
    constructor(apiClient?: ApiClient);
    getFullMarketQuote(
      symbol: string,
      callback?: (
        error: any,
        data: GetFullMarketQuoteResponse,
        response: any
      ) => void
    ): Promise<GetFullMarketQuoteResponse>;
    getMarketQuoteOHLC(
      symbol: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    ltp(
      symbol: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
  }

  export class MarketQuoteV3Api {
    constructor(apiClient?: ApiClient);
    getLtp(
      symbol: string,
      callback?: (
        error: any,
        data: GetMarketQuoteLastTradedPriceResponseV3,
        response: any
      ) => void
    ): Promise<GetMarketQuoteLastTradedPriceResponseV3>;
    getMarketQuoteOHLC(
      symbol: string,
      interval?: string,
      callback?: (
        error: any,
        data: GetMarketQuoteOHLCResponseV3,
        response: any
      ) => void
    ): Promise<GetMarketQuoteOHLCResponseV3>;
    getMarketQuoteOptionGreek(
      symbol: string,
      callback?: (
        error: any,
        data: GetMarketQuoteOptionGreekResponseV3,
        response: any
      ) => void
    ): Promise<GetMarketQuoteOptionGreekResponseV3>;
  }

  export class OptionsApi {
    constructor(apiClient?: ApiClient);
    getOptionContracts(
      instrument_key: string,
      expiry_date: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getPutCallOptionChain(
      instrument_key: string,
      expiry_date: string,
      callback?: (
        error: any,
        data: GetOptionChainResponse,
        response: any
      ) => void
    ): Promise<GetOptionChainResponse>;
  }

  export class OrderApi {
    constructor(apiClient?: ApiClient);
    cancelMultiOrder(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    cancelOrder(
      order_id: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    exitPositions(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getOrderBook(
      callback?: (error: any, data: GetOrderBookResponse, response: any) => void
    ): Promise<GetOrderBookResponse>;
    getOrderDetails(
      order_id?: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getOrderStatus(
      order_id?: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getTradeHistory(
      callback?: (error: any, data: GetTradeResponse, response: any) => void
    ): Promise<GetTradeResponse>;
    getTradesByOrder(
      order_id: string,
      callback?: (error: any, data: GetTradeResponse, response: any) => void
    ): Promise<GetTradeResponse>;
    modifyOrder(
      body: ModifyOrderRequest,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    placeMultiOrder(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    placeOrder1(
      body: any,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
  }

  export class OrderApiV3 {
    constructor(apiClient?: ApiClient);
    cancelGTTOrder(
      body: GttCancelOrderRequest,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    cancelOrder(
      order_id: string,
      callback?: (
        error: any,
        data: CancelOrderV3Response,
        response: any
      ) => void,
      algoName?: string
    ): Promise<CancelOrderV3Response>;
    getGttOrderDetails(
      callback?: (error: any, data: GetGttOrderResponse, response: any) => void
    ): Promise<GetGttOrderResponse>;
    modifyGTTOrder(
      body: GttModifyOrderRequest,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    modifyOrder(
      body: ModifyOrderRequest,
      callback?: (
        error: any,
        data: ModifyOrderV3Response,
        response: any
      ) => void,
      algoName?: string
    ): Promise<ModifyOrderV3Response>;
    placeGTTOrder(
      body: GttPlaceOrderRequest,
      callback?: (
        error: any,
        data: GttTriggerOrderResponse,
        response: any
      ) => void
    ): Promise<GttTriggerOrderResponse>;
    placeOrder(
      body: PlaceOrderV3Request,
      opts?: { slice?: boolean },
      callback?: (
        error: any,
        data: PlaceOrderV3Response,
        response: any
      ) => void,
      algoName?: string
    ): Promise<PlaceOrderV3Response>;
  }

  export class PortfolioApi {
    constructor(apiClient?: ApiClient);
    convertPositions(
      body: ConvertPositionRequest,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getHoldings(
      callback?: (error: any, data: GetHoldingsResponse, response: any) => void
    ): Promise<GetHoldingsResponse>;
    getMtfPositions(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getPositions(
      callback?: (error: any, data: GetPositionResponse, response: any) => void
    ): Promise<GetPositionResponse>;
  }

  export class PostTradeApi {
    constructor(apiClient?: ApiClient);
    getTradesByDateRange(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
  }

  export class TradeProfitAndLossApi {
    constructor(apiClient?: ApiClient);
    getProfitAndLossCharges(
      segment: string,
      financial_year: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getTradeWiseProfitAndLossData(
      segment: string,
      financial_year: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getTradeWiseProfitAndLossMetaData(
      segment: string,
      financial_year: string,
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
  }

  export class UserApi {
    constructor(apiClient?: ApiClient);
    getProfile(
      callback?: (error: any, data: GetProfileResponse, response: any) => void
    ): Promise<GetProfileResponse>;
    getUserFundMargin(
      callback?: (
        error: any,
        data: GetUserFundMarginResponse,
        response: any
      ) => void
    ): Promise<GetUserFundMarginResponse>;
  }

  export class WebsocketApi {
    constructor(apiClient?: ApiClient);
    getMarketDataFeed(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getMarketDataFeedAuthorize(
      callback?: (
        error: any,
        data: WebsocketAuthRedirectResponse,
        response: any
      ) => void
    ): Promise<WebsocketAuthRedirectResponse>;
    getPortfolioStreamFeed(
      callback?: (error: any, data: any, response: any) => void
    ): Promise<any>;
    getPortfolioStreamFeedAuthorize(
      callback?: (
        error: any,
        data: WebsocketAuthRedirectResponse,
        response: any
      ) => void
    ): Promise<WebsocketAuthRedirectResponse>;
  }

  // ==================== WebSocket Streamers ====================
  
  /**
   * Base Streamer class that all streamers extend
   */
  class Streamer extends EventEmitter {
    protected streamer: any;
    Event: {
      OPEN: "open";
      CLOSE: "close";
      MESSAGE: "message";
      ERROR: "error";
      RECONNECTING: "reconnecting";
      AUTO_RECONNECT_STOPPED: "autoReconnectStopped";
    };
    autoReconnect(enable: boolean, interval?: number, retryCount?: number): void;
  }

  export type MarketDataMode = "ltpc" | "full" | "full_d30" | "option_greeks";

  export interface MarketDataMessage {
    feeds: Record<
      string,
      {
        ff?: {
          indexFF?: number;
          marketFF?: number;
        };
        ltpc?: {
          ltp?: number;
          ltt?: number;
          ltq?: number;
          cp?: number;
        };
        marketOHLC?: {
          ohlc?: Array<{
            interval: string;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
            ts: number;
          }>;
        };
        marketLevel?: {
          bidAskQuote?: Array<{
            bq: number;
            bp: number;
            bno: number;
            aq: number;
            ap: number;
            ano: number;
          }>;
        };
        optionGreek?: {
          vega?: number;
          theta?: number;
          gamma?: number;
          delta?: number;
          iv?: number;
        };
        eFeedDetails?: {
          cp?: number;
          mp?: number;
          lf?: number;
          pp?: number;
          fh?: number;
          fl?: number;
        };
      }
    >;
  }

  export class MarketDataStreamerV3 extends Streamer {
    Mode: {
      LTPC: "ltpc";
      FULL: "full";
      OPTION: "option_greeks";
      D30: "full_d30";
    };
    
    constructor(instrumentKeys?: string[], mode?: MarketDataMode);
    connect(): Promise<void>;
    disconnect(): void;
    subscribe(instrumentKeys: string[], mode: MarketDataMode): void;
    unsubscribe(instrumentKeys: string[]): void;
    changeMode(instrumentKeys: string[], mode: MarketDataMode): void;

    on(event: "open", listener: () => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "message", listener: (data: Buffer) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "reconnecting", listener: (attempt: number) => void): this;
    on(
      event: "autoReconnectStopped",
      listener: (message: string) => void
    ): this;
  }

  export interface PortfolioUpdateType {
    orderUpdate?: boolean;
    positionUpdate?: boolean;
    holdingUpdate?: boolean;
    gttUpdate?: boolean;
  }

  export interface PortfolioMessage {
    type: "order" | "position" | "holding" | "gtt";
    data: any;
  }

  export class PortfolioDataStreamer extends Streamer {
    constructor(
      orderUpdate?: boolean,
      positionUpdate?: boolean,
      holdingUpdate?: boolean,
      gttUpdate?: boolean
    );
    connect(): Promise<void>;
    disconnect(): void;
    autoReconnect(
      enable: boolean,
      interval?: number,
      retryCount?: number
    ): void;

    on(event: "open", listener: () => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "message", listener: (data: Buffer) => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "reconnecting", listener: (attempt: number) => void): this;
    on(
      event: "autoReconnectStopped",
      listener: (message: string) => void
    ): this;
  }
}
