/**
 * Type declarations for upstox-js-sdk v2.21.0
 * Based on actual SDK source code analysis
 * Generated: 2025-11-17
 */

declare module "upstox-js-sdk" {
  // ============================================
  // Core API Client
  // ============================================
  export class ApiClient {
    static instance: ApiClient;
    authentications: {
      OAUTH2: {
        accessToken: string;
      };
    };
    callApi(
      path: string,
      httpMethod: string,
      pathParams: Record<string, any>,
      queryParams: Record<string, any>,
      headerParams: Record<string, any>,
      formParams: Record<string, any>,
      bodyParam: any,
      authNames: string[],
      contentTypes: string[],
      accepts: string[],
      returnType: any,
      callback: CallbackFunction
    ): any;
  }

  // ============================================
  // Callback Types
  // ============================================
  type CallbackFunction = (error: any, data: any, response: any) => void;

  // ============================================
  // API Classes
  // ============================================

  export class MarketQuoteV3Api {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    /**
     * Get Last Traded Price (LTP) for instruments
     * @param opts Options object with instrumentKey (comma-separated list)
     * @param callback Callback function (error, data, response)
     */
    getLtp(opts: { instrumentKey?: string }, callback: CallbackFunction): void;

    /**
     * Get OHLC quotes for instruments
     * @param interval Interval for OHLC data
     * @param opts Options object with instrumentKey (comma-separated list)
     * @param callback Callback function (error, data, response)
     */
    getMarketQuoteOHLC(
      interval: string,
      opts: { instrumentKey?: string },
      callback: CallbackFunction
    ): void;

    /**
     * Alias for getMarketQuoteOHLC
     */
    getOhlc(
      opts: { instrumentKey?: string; interval?: string },
      callback: CallbackFunction
    ): void;

    /**
     * Get Option Greeks for instruments
     * @param opts Options object with instrumentKey (comma-separated list)
     * @param callback Callback function (error, data, response)
     */
    getMarketQuoteOptionGreek(
      opts: { instrumentKey?: string },
      callback: CallbackFunction
    ): void;

    /**
     * Alias for getMarketQuoteOptionGreek
     */
    getOptionGreek(
      opts: { instrumentKey?: string },
      callback: CallbackFunction
    ): void;
  }

  export class HistoryV3Api {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    /**
     * Get historical candle data
     * @param instrumentKey Instrument key
     * @param unit Unit (minute/day/week/month)
     * @param interval Interval value
     * @param toDate End date (YYYY-MM-DD)
     * @param callback Callback function
     */
    getHistoricalCandleData(
      instrumentKey: string,
      unit: string,
      interval: number,
      toDate: string,
      callback: CallbackFunction
    ): void;

    /**
     * Get historical candle data with from date
     * @param instrumentKey Instrument key
     * @param unit Unit (minute/day/week/month)
     * @param interval Interval value
     * @param toDate End date (YYYY-MM-DD)
     * @param fromDate Start date (YYYY-MM-DD)
     * @param callback Callback function
     */
    getHistoricalCandleData1(
      instrumentKey: string,
      unit: string,
      interval: number,
      toDate: string,
      fromDate: string,
      callback: CallbackFunction
    ): void;

    /**
     * Get intraday candle data
     * @param instrumentKey Instrument key
     * @param unit Unit (minute/day)
     * @param interval Interval value
     * @param fromDate Start date (YYYY-MM-DD)
     * @param toDate End date (YYYY-MM-DD)
     * @param callback Callback function
     */
    getIntraDayCandleData(
      instrumentKey: string,
      unit: string,
      interval: number,
      fromDate: string,
      toDate: string,
      callback: CallbackFunction
    ): void;
  }

  export class OptionsApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    /**
     * Get option contracts
     * @param instrumentKey Instrument key
     * @param expiryDate Expiry date
     * @param callback Callback function
     */
    getOptionContracts(
      instrumentKey: string,
      expiryDate: string,
      callback: CallbackFunction
    ): void;

    /**
     * Get Put-Call option chain
     * @param instrumentKey Instrument key
     * @param expiryDate Expiry date
     * @param apiVersion API version
     * @param callback Callback function
     */
    getPutCallOptionChain(
      instrumentKey: string,
      expiryDate: string,
      apiVersion: string,
      callback: CallbackFunction
    ): void;
  }

  export class OrderApiV3 {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    /**
     * Place a new order
     * @param body Order request body
     * @param opts Optional parameters
     * @param callback Callback function
     * @param algoName Optional algorithm name header
     */
    placeOrder(
      body: PlaceOrderV3Request,
      opts: any,
      callback: CallbackFunction,
      algoName?: string
    ): void;

    /**
     * Modify an existing order
     * @param body Modify order request
     * @param callback Callback function
     * @param algoName Optional algorithm name header
     */
    modifyOrder(
      body: ModifyOrderRequest,
      callback: CallbackFunction,
      algoName?: string
    ): void;

    /**
     * Cancel an order
     * @param orderId Order ID to cancel
     * @param callback Callback function
     * @param algoName Optional algorithm name header
     */
    cancelOrder(
      orderId: string,
      callback: CallbackFunction,
      algoName?: string
    ): void;

    /**
     * Place GTT (Good Till Triggered) order
     * @param body GTT order request
     * @param callback Callback function
     * @param algoName Optional algorithm name header
     */
    placeGTTOrder(
      body: any,
      callback: CallbackFunction,
      algoName?: string
    ): void;

    /**
     * Cancel GTT order
     * @param body GTT cancel request
     * @param callback Callback function
     * @param algoName Optional algorithm name header
     */
    cancelGTTOrder(
      body: any,
      callback: CallbackFunction,
      algoName?: string
    ): void;
  }

  export class MarketQuoteApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    /**
     * Get full market quote with depth
     * @param symbol Instrument symbol (comma-separated for multiple)
     * @param apiVersion API version
     * @param callback Callback function
     */
    getFullMarketQuote(
      symbol: string,
      apiVersion: string,
      callback: CallbackFunction
    ): void;

    /**
     * Get OHLC data
     * @param symbol Instrument symbol
     * @param interval Interval
     * @param apiVersion API version
     * @param callback Callback function
     */
    getMarketQuoteOHLC(
      symbol: string,
      interval: string,
      apiVersion: string,
      callback: CallbackFunction
    ): void;

    /**
     * Get Last Traded Price
     * @param symbol Instrument symbol
     * @param apiVersion API version
     * @param callback Callback function
     */
    getLTP(
      symbol: string,
      apiVersion: string,
      callback: CallbackFunction
    ): void;
  }

  export class PortfolioApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    getPositions(apiVersion: string, callback: CallbackFunction): void;
    getHoldings(apiVersion: string, callback: CallbackFunction): void;
    getUserFundMargin(
      apiVersion: string,
      segment: any,
      callback: CallbackFunction
    ): void;
    convertPositions(
      apiVersion: string,
      body: ConvertPositionRequest,
      callback: CallbackFunction
    ): void;
  }

  export class LoginApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    token(
      apiVersion: string,
      body: TokenRequest,
      callback: CallbackFunction
    ): void;
    logout(apiVersion: string, callback: CallbackFunction): void;
  }

  export class UserApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    getProfile(apiVersion: string, callback: CallbackFunction): void;
    getUserFundMargin(
      apiVersion: string,
      segment: any,
      callback: CallbackFunction
    ): void;
  }

  export class WebsocketApi {
    constructor(apiClient?: ApiClient);
    apiClient: ApiClient;

    getMarketDataFeed(apiVersion: string, callback: CallbackFunction): void;
    getMarketDataFeedAuthorize(
      apiVersion: string,
      callback: CallbackFunction
    ): void;
    getMarketDataFeedAuthorizeV3(callback: CallbackFunction): void;
    getPortfolioStreamFeed(
      apiVersion: string,
      callback: CallbackFunction
    ): void;
    getPortfolioStreamFeedAuthorize(
      apiVersion: string,
      callback: CallbackFunction
    ): void;
  }

  // ============================================
  // Request/Response Models
  // ============================================

  export class PlaceOrderV3Request {
    constructor(
      quantity: number,
      product: string,
      validity: string,
      price: number,
      instrumentToken: string,
      orderType: string,
      transactionType: string,
      disclosedQuantity: number,
      triggerPrice: number,
      isAmo: boolean
    );

    quantity: number;
    product: string;
    validity: string;
    price: number;
    instrumentToken: string;
    orderType: string;
    transactionType: string;
    disclosedQuantity: number;
    triggerPrice: number;
    isAmo: boolean;
    tag?: string;
    slice?: boolean;

    static ProductEnum: {
      I: "I";
      D: "D";
      CNC: "CNC";
      MTF: "MTF";
    };

    static ValidityEnum: {
      DAY: "DAY";
      IOC: "IOC";
    };

    static OrderTypeEnum: {
      MARKET: "MARKET";
      LIMIT: "LIMIT";
      SL: "SL";
      "SL-M": "SL-M";
    };

    static TransactionTypeEnum: {
      BUY: "BUY";
      SELL: "SELL";
    };
  }

  export class ModifyOrderRequest {
    quantity?: number;
    validity?: string;
    price?: number;
    orderId: string;
    orderType?: string;
    disclosedQuantity?: number;
    triggerPrice?: number;
  }

  export class TokenRequest {
    constructor(
      code: string,
      clientId: string,
      clientSecret: string,
      redirectUri: string,
      grantType: string
    );

    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    grantType: string;
  }

  export class ConvertPositionRequest {
    constructor(
      instrumentToken: string,
      newProduct: string,
      oldProduct: string,
      quantity: number,
      transactionType: string
    );

    instrumentToken: string;
    newProduct: string;
    oldProduct: string;
    quantity: number;
    transactionType: string;
  }

  // ============================================
  // WebSocket Streamers
  // ============================================

  export class MarketDataStreamerV3 {
    Mode: {
      LTPC: "ltpc";
      FULL: "full";
      OPTION: "option_greeks";
      D30: "full_d30";
    };

    Event: {
      OPEN: "open";
      CLOSE: "close";
      MESSAGE: "message";
      ERROR: "error";
      RECONNECTING: "reconnecting";
      RECONNECTED: "reconnected";
    };

    constructor(instrumentKeys?: string[], mode?: string);

    connect(): Promise<void>;
    disconnect(): void;
    subscribe(instrumentKeys: string[], mode: string): void;
    unsubscribe(instrumentKeys: string[]): void;
    changeMode(instrumentKeys: string[], newMode: string): void;
    autoReconnect(enable: boolean, interval: number, retryCount: number): void;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }

  export class PortfolioDataStreamer {
    Event: {
      OPEN: "open";
      CLOSE: "close";
      MESSAGE: "message";
      ERROR: "error";
      RECONNECTING: "reconnecting";
      RECONNECTED: "reconnected";
    };

    constructor();

    connect(): Promise<void>;
    disconnect(): void;
    autoReconnect(enable: boolean, interval: number, retryCount: number): void;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }

  // ============================================
  // Namespace Export for Compatibility
  // ============================================
  export namespace UpstoxClient {
    export {
      ApiClient,
      MarketQuoteV3Api,
      MarketQuoteApi,
      HistoryV3Api,
      OptionsApi,
      OrderApiV3,
      PortfolioApi,
      LoginApi,
      UserApi,
      WebsocketApi,
      PlaceOrderV3Request,
      ModifyOrderRequest,
      TokenRequest,
      ConvertPositionRequest,
      MarketDataStreamerV3,
      PortfolioDataStreamer,
    };
  }

  // ============================================
  // Default Export
  // ============================================
  const _default: {
    ApiClient: typeof ApiClient;
    MarketQuoteV3Api: typeof MarketQuoteV3Api;
    MarketQuoteApi: typeof MarketQuoteApi;
    HistoryV3Api: typeof HistoryV3Api;
    OptionsApi: typeof OptionsApi;
    OrderApiV3: typeof OrderApiV3;
    PortfolioApi: typeof PortfolioApi;
    LoginApi: typeof LoginApi;
    UserApi: typeof UserApi;
    WebsocketApi: typeof WebsocketApi;
    PlaceOrderV3Request: typeof PlaceOrderV3Request;
    ModifyOrderRequest: typeof ModifyOrderRequest;
    TokenRequest: typeof TokenRequest;
    ConvertPositionRequest: typeof ConvertPositionRequest;
    MarketDataStreamerV3: typeof MarketDataStreamerV3;
    PortfolioDataStreamer: typeof PortfolioDataStreamer;
  };

  export default _default;
}
