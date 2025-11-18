/**
 * Type-Safe Upstox Client
 * Merges upstox-js-sdk with existing OpenAPI-generated types
 */

import * as UpstoxJS from "upstox-js-sdk";
import type {
  GetOrderBookResponse,
  GetPositionResponse,
  GetHoldingsResponse,
  GetProfileResponse,
  GetUserFundMarginResponse,
  GetFullMarketQuoteResponse,
  GetMarketQuoteOHLCResponseV3,
  GetMarketQuoteLastTradedPriceResponseV3,
  GetMarketQuoteOptionGreekResponseV3,
  GetHistoricalCandleResponse,
  GetOptionChainResponse,
  PlaceOrderV3Response,
  ModifyOrderV3Response,
  CancelOrderV3Response,
  GetGttOrderResponse,
  GttTriggerOrderResponse,
  GetBrokerageResponse,
  PostMarginResponse,
  GetMarketStatusResponse,
  GetHolidayResponse,
  GetExchangeTimingResponse,
  GetTradeResponse,
  WebsocketAuthRedirectResponse,
  LogoutResponse,
  TokenResponse,
} from "./models";

export interface UpstoxClientConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  sandbox?: boolean;
}

/**
 * Main Upstox Client with full type safety
 */
export class UpstoxClient {
  private client: UpstoxJS.ApiClient;
  private _orderApi?: UpstoxJS.OrderApiV3;
  private _portfolioApi?: UpstoxJS.PortfolioApi;
  private _marketQuoteApi?: UpstoxJS.MarketQuoteV3Api;
  private _userApi?: UpstoxJS.UserApi;
  private _historyApi?: UpstoxJS.HistoryV3Api;
  private _optionsApi?: UpstoxJS.OptionsApi;
  private _chargeApi?: UpstoxJS.ChargeApi;
  private _marketHolidaysApi?: UpstoxJS.MarketHolidaysAndTimingsApi;
  private _websocketApi?: UpstoxJS.WebsocketApi;
  private _loginApi?: UpstoxJS.LoginApi;
  private _tradeApi?: UpstoxJS.TradeProfitAndLossApi;

  constructor(config?: UpstoxClientConfig) {
    this.client = new UpstoxJS.ApiClient(config?.sandbox || false);

    if (config?.accessToken) {
      this.client.authentications.OAUTH2.accessToken = config.accessToken;
    }
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string): void {
    this.client.authentications.OAUTH2.accessToken = token;
  }

  /**
   * Get raw API client instance (for advanced usage)
   */
  getRawClient(): UpstoxJS.ApiClient {
    return this.client;
  }

  // ==================== Order API ====================
  get orderApi(): UpstoxJS.OrderApiV3 {
    if (!this._orderApi) {
      this._orderApi = new UpstoxJS.OrderApiV3(this.client);
    }
    return this._orderApi;
  }

  /**
   * Place a new order (market/limit/stop-loss)
   */
  async placeOrder(
    request: any,
    options?: { slice?: boolean },
    algoName?: string
  ): Promise<any> {
    return this.orderApi.placeOrder(request, options, undefined, algoName);
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(request: any, algoName?: string): Promise<any> {
    return this.orderApi.modifyOrder(request, undefined, algoName);
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, algoName?: string): Promise<any> {
    return this.orderApi.cancelOrder(orderId, undefined, algoName);
  }

  /**
   * Get order book (all orders)
   */
  async getOrderBook(): Promise<GetOrderBookResponse> {
    const orderApiV2 = new UpstoxJS.OrderApi(this.client);
    return orderApiV2.getOrderBook();
  }

  /**
   * Get order history for a specific order
   */
  async getOrderHistory(orderId: string): Promise<any> {
    const orderApiV2 = new UpstoxJS.OrderApi(this.client);
    return orderApiV2.getOrderDetails(orderId);
  }

  /**
   * Get trades for the day
   */
  async getTrades(): Promise<GetTradeResponse> {
    const orderApiV2 = new UpstoxJS.OrderApi(this.client);
    return orderApiV2.getTradeHistory();
  }

  /**
   * Get trades for a specific order
   */
  async getTradesByOrder(orderId: string): Promise<GetTradeResponse> {
    const orderApiV2 = new UpstoxJS.OrderApi(this.client);
    return orderApiV2.getTradesByOrder(orderId);
  }

  // ==================== GTT Orders ====================
  /**
   * Place a GTT order (Good Till Triggered)
   */
  async placeGTTOrder(request: any): Promise<any> {
    return this.orderApi.placeGTTOrder(request);
  }

  /**
   * Modify a GTT order
   */
  async modifyGTTOrder(request: UpstoxJS.GttModifyOrderRequest): Promise<any> {
    return this.orderApi.modifyGTTOrder(request);
  }

  /**
   * Cancel a GTT order
   */
  async cancelGTTOrder(request: UpstoxJS.GttCancelOrderRequest): Promise<any> {
    return this.orderApi.cancelGTTOrder(request);
  }

  /**
   * Get all GTT orders
   */
  async getGTTOrders(): Promise<GetGttOrderResponse> {
    return this.orderApi.getGttOrderDetails();
  }

  // ==================== Portfolio API ====================
  get portfolioApi(): UpstoxJS.PortfolioApi {
    if (!this._portfolioApi) {
      this._portfolioApi = new UpstoxJS.PortfolioApi(this.client);
    }
    return this._portfolioApi;
  }

  /**
   * Get positions (short-term holdings)
   */
  async getPositions(): Promise<GetPositionResponse> {
    return this.portfolioApi.getPositions();
  }

  /**
   * Get holdings (long-term holdings)
   */
  async getHoldings(): Promise<GetHoldingsResponse> {
    return this.portfolioApi.getHoldings();
  }

  /**
   * Convert position product type
   */
  async convertPosition(
    request: UpstoxJS.ConvertPositionRequest
  ): Promise<any> {
    return this.portfolioApi.convertPositions(request);
  }

  /**
   * Get MTF (Margin Trading Facility) positions
   */
  async getMtfPositions(): Promise<any> {
    return this.portfolioApi.getMtfPositions();
  }

  // ==================== User API ====================
  get userApi(): UpstoxJS.UserApi {
    if (!this._userApi) {
      this._userApi = new UpstoxJS.UserApi(this.client);
    }
    return this._userApi;
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<GetProfileResponse> {
    return this.userApi.getProfile();
  }

  /**
   * Get user funds and margin
   */
  async getFundsAndMargin(): Promise<GetUserFundMarginResponse> {
    return this.userApi.getUserFundMargin();
  }

  // ==================== Market Quote API ====================
  get marketQuoteApi(): UpstoxJS.MarketQuoteV3Api {
    if (!this._marketQuoteApi) {
      this._marketQuoteApi = new UpstoxJS.MarketQuoteV3Api(this.client);
    }
    return this._marketQuoteApi;
  }

  /**
   * Get last traded price (LTP) for instruments
   */
  async getLTP(
    instrumentKeys: string | string[]
  ): Promise<GetMarketQuoteLastTradedPriceResponseV3> {
    const symbols = Array.isArray(instrumentKeys)
      ? instrumentKeys.join(",")
      : instrumentKeys;
    return this.marketQuoteApi.getLtp(symbols);
  }

  /**
   * Get OHLC (Open, High, Low, Close) data
   */
  async getOHLC(
    instrumentKeys: string | string[],
    interval?: string
  ): Promise<GetMarketQuoteOHLCResponseV3> {
    const symbols = Array.isArray(instrumentKeys)
      ? instrumentKeys.join(",")
      : instrumentKeys;
    return this.marketQuoteApi.getMarketQuoteOHLC(symbols, interval);
  }

  /**
   * Get option Greeks (Delta, Gamma, Vega, Theta, IV)
   */
  async getOptionGreeks(
    instrumentKeys: string | string[]
  ): Promise<GetMarketQuoteOptionGreekResponseV3> {
    const symbols = Array.isArray(instrumentKeys)
      ? instrumentKeys.join(",")
      : instrumentKeys;
    return this.marketQuoteApi.getMarketQuoteOptionGreek(symbols);
  }

  /**
   * Get full market quote with depth
   */
  async getFullMarketQuote(
    instrumentKeys: string | string[]
  ): Promise<GetFullMarketQuoteResponse> {
    const symbols = Array.isArray(instrumentKeys)
      ? instrumentKeys.join(",")
      : instrumentKeys;
    const marketQuoteV2 = new UpstoxJS.MarketQuoteApi(this.client);
    return marketQuoteV2.getFullMarketQuote(symbols);
  }

  // ==================== Historical Data API ====================
  get historyApi(): UpstoxJS.HistoryV3Api {
    if (!this._historyApi) {
      this._historyApi = new UpstoxJS.HistoryV3Api(this.client);
    }
    return this._historyApi;
  }

  /**
   * Get historical candle data
   */
  async getHistoricalCandles(
    instrumentKey: string,
    unit: "minute" | "hour" | "day" | "week" | "month",
    interval: string,
    toDate: string,
    fromDate?: string
  ): Promise<GetHistoricalCandleResponse> {
    if (fromDate) {
      return this.historyApi.getHistoricalCandleData1(
        instrumentKey,
        unit,
        interval,
        toDate,
        fromDate
      );
    }
    return this.historyApi.getHistoricalCandleData(
      instrumentKey,
      unit,
      interval,
      toDate
    );
  }

  /**
   * Get intraday candle data
   */
  async getIntradayCandles(
    instrumentKey: string,
    unit: "minute",
    interval: string
  ): Promise<GetHistoricalCandleResponse> {
    return this.historyApi.getIntraDayCandleData(instrumentKey, unit, interval);
  }

  // ==================== Options API ====================
  get optionsApi(): UpstoxJS.OptionsApi {
    if (!this._optionsApi) {
      this._optionsApi = new UpstoxJS.OptionsApi(this.client);
    }
    return this._optionsApi;
  }

  /**
   * Get option chain
   */
  async getOptionChain(
    instrumentKey: string,
    expiryDate: string
  ): Promise<GetOptionChainResponse> {
    return this.optionsApi.getPutCallOptionChain(instrumentKey, expiryDate);
  }

  /**
   * Get option contracts
   */
  async getOptionContracts(
    instrumentKey: string,
    expiryDate: string
  ): Promise<any> {
    return this.optionsApi.getOptionContracts(instrumentKey, expiryDate);
  }

  // ==================== Charge API ====================
  get chargeApi(): UpstoxJS.ChargeApi {
    if (!this._chargeApi) {
      this._chargeApi = new UpstoxJS.ChargeApi(this.client);
    }
    return this._chargeApi;
  }

  /**
   * Get brokerage charges for a trade
   */
  async getBrokerage(
    instrumentToken: string,
    quantity: number,
    product: string,
    transactionType: "BUY" | "SELL",
    price: number
  ): Promise<GetBrokerageResponse> {
    return this.chargeApi.getBrokerage(
      instrumentToken,
      quantity,
      product,
      transactionType,
      price
    );
  }

  /**
   * Calculate margin required for an order
   */
  async postMargin(request: any): Promise<any> {
    return this.chargeApi.postMargin(request);
  }

  // ==================== Market Holidays & Timings API ====================
  get marketHolidaysApi(): UpstoxJS.MarketHolidaysAndTimingsApi {
    if (!this._marketHolidaysApi) {
      this._marketHolidaysApi = new UpstoxJS.MarketHolidaysAndTimingsApi(
        this.client
      );
    }
    return this._marketHolidaysApi;
  }

  /**
   * Get market status for an exchange
   */
  async getMarketStatus(
    exchange: "NSE" | "BSE" | "NFO" | "BFO" | "MCX"
  ): Promise<GetMarketStatusResponse> {
    return this.marketHolidaysApi.getMarketStatus(exchange);
  }

  /**
   * Get holidays for the current year
   */
  async getHolidays(): Promise<GetHolidayResponse> {
    return this.marketHolidaysApi.getHolidays();
  }

  /**
   * Get holiday for a specific date
   */
  async getHoliday(date: string): Promise<GetHolidayResponse> {
    return this.marketHolidaysApi.getHoliday(date);
  }

  /**
   * Get exchange timings for a date
   */
  async getExchangeTimings(date: string): Promise<GetExchangeTimingResponse> {
    return this.marketHolidaysApi.getExchangeTimings(date);
  }

  // ==================== WebSocket API ====================
  get websocketApi(): UpstoxJS.WebsocketApi {
    if (!this._websocketApi) {
      this._websocketApi = new UpstoxJS.WebsocketApi(this.client);
    }
    return this._websocketApi;
  }

  /**
   * Get WebSocket authorization for market data feed
   */
  async getMarketDataFeedAuthorize(): Promise<any> {
    return this.websocketApi.getMarketDataFeedAuthorize();
  }

  /**
   * Get WebSocket authorization for portfolio stream
   */
  async getPortfolioStreamFeedAuthorize(): Promise<any> {
    return this.websocketApi.getPortfolioStreamFeedAuthorize();
  }

  /**
   * Create market data streamer (WebSocket)
   */
  createMarketDataStreamer(
    instrumentKeys?: string[],
    mode?: "ltpc" | "full" | "full_d30" | "option_greeks"
  ): UpstoxJS.MarketDataStreamerV3 {
    return new UpstoxJS.MarketDataStreamerV3(instrumentKeys, mode);
  }

  /**
   * Create portfolio data streamer (WebSocket)
   */
  createPortfolioDataStreamer(
    orderUpdate = true,
    positionUpdate = false,
    holdingUpdate = false,
    gttUpdate = false
  ): UpstoxJS.PortfolioDataStreamer {
    return new UpstoxJS.PortfolioDataStreamer(
      orderUpdate,
      positionUpdate,
      holdingUpdate,
      gttUpdate
    );
  }

  // ==================== Login API ====================
  get loginApi(): UpstoxJS.LoginApi {
    if (!this._loginApi) {
      this._loginApi = new UpstoxJS.LoginApi(this.client);
    }
    return this._loginApi;
  }

  /**
   * Exchange authorization code for access token
   */
  async token(
    apiVersion: string,
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    grantType: string
  ): Promise<any> {
    return this.loginApi.token(
      apiVersion,
      code,
      clientId,
      clientSecret,
      redirectUri,
      grantType
    );
  }

  /**
   * Logout and invalidate token
   */
  async logout(): Promise<LogoutResponse> {
    return this.loginApi.logout();
  }

  // ==================== Trade P&L API ====================
  get tradeApi(): UpstoxJS.TradeProfitAndLossApi {
    if (!this._tradeApi) {
      this._tradeApi = new UpstoxJS.TradeProfitAndLossApi(this.client);
    }
    return this._tradeApi;
  }

  /**
   * Get profit and loss charges
   */
  async getProfitAndLossCharges(
    segment: string,
    financialYear: string
  ): Promise<any> {
    return this.tradeApi.getProfitAndLossCharges(segment, financialYear);
  }

  /**
   * Get trade-wise profit and loss data
   */
  async getTradeWiseProfitAndLoss(
    segment: string,
    financialYear: string
  ): Promise<any> {
    return this.tradeApi.getTradeWiseProfitAndLossData(segment, financialYear);
  }
}
