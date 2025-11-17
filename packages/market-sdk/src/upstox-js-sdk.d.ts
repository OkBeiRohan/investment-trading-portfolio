/**
 * Type declarations for upstox-js-sdk
 * This provides basic types for the Upstox Node.js SDK
 */

declare module "upstox-js-sdk" {
  export namespace UpstoxClient {
    class ApiClient {
      static instance: ApiClient;
      authentications: {
        OAUTH2: {
          accessToken: string;
        };
      };
    }

    // API Classes
    class OrderApi {
      placeOrder(
        body: any,
        apiVersion: string,
        callback: Function,
        algoName?: string
      ): void;
      placeMultiOrder(body: any, callback: Function, algoName?: string): void;
      modifyOrder(
        body: any,
        apiVersion: string,
        callback: Function,
        algoName?: string
      ): void;
      cancelOrder(
        orderId: string,
        apiVersion: string,
        callback: Function
      ): void;
      getOrderBook(apiVersion: string, callback: Function): void;
      getOrderDetails(
        apiVersion: string,
        orderId: string,
        tag: any,
        callback: Function
      ): void;
      getTradeHistory(apiVersion: string, callback: Function): void;
      getTradesByOrder(
        orderId: string,
        apiVersion: string,
        callback: Function
      ): void;
    }

    class OrderApiV3 {
      placeOrder(
        body: any,
        opts: any,
        callback: Function,
        algoName?: string
      ): void;
      modifyOrder(body: any, callback: Function, algoName?: string): void;
      cancelOrder(orderId: string, callback: Function, algoName?: string): void;
      placeGTTOrder(body: any, callback: Function, algoName?: string): void;
    }

    class MarketQuoteApi {
      getFullMarketQuote(
        symbol: string,
        apiVersion: string,
        callback: Function
      ): void;
      getMarketQuoteOHLC(
        symbol: string,
        interval: string,
        apiVersion: string,
        callback: Function
      ): void;
      getLTP(symbol: string, apiVersion: string, callback: Function): void;
    }

    class MarketQuoteV3Api {
      getLtp(opts: any, callback: Function): void;
      getOhlc(opts: any, callback: Function): void;
      getOptionGreek(opts: any, callback: Function): void;
    }

    class HistoryV3Api {
      getIntraDayCandleData(
        instrumentKey: string,
        interval: string,
        fromDate: string,
        toDate: string,
        callback: Function
      ): void;
      getHistoricalCandleData(
        instrumentKey: string,
        interval: string,
        toDate: string,
        fromDate: string,
        callback: Function
      ): void;
    }

    class OptionsApi {
      getOptionContracts(
        instrumentKey: string,
        expiryDate: string,
        callback: Function
      ): void;
      getPutCallOptionChain(
        instrumentKey: string,
        expiryDate: string,
        apiVersion: string,
        callback: Function
      ): void;
    }

    class PortfolioApi {
      getPositions(apiVersion: string, callback: Function): void;
      getHoldings(apiVersion: string, callback: Function): void;
      getUserFundMargin(
        apiVersion: string,
        segment: any,
        callback: Function
      ): void;
      convertPositions(apiVersion: string, body: any, callback: Function): void;
    }

    class LoginApi {
      token(apiVersion: string, body: any, callback: Function): void;
      logout(apiVersion: string, callback: Function): void;
    }

    class UserApi {
      getProfile(apiVersion: string, callback: Function): void;
      getUserFundMargin(
        apiVersion: string,
        segment: any,
        callback: Function
      ): void;
    }

    class WebsocketApi {
      getMarketDataFeed(apiVersion: string, callback: Function): void;
      getMarketDataFeedAuthorize(apiVersion: string, callback: Function): void;
      getMarketDataFeedAuthorizeV3(callback: Function): void;
      getPortfolioStreamFeed(apiVersion: string, callback: Function): void;
      getPortfolioStreamFeedAuthorize(
        apiVersion: string,
        callback: Function
      ): void;
    }

    // Request/Response Models
    class PlaceOrderRequest {
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
      static ProductEnum: {
        D: string;
        I: string;
        CNC: string;
        MTF: string;
      };
      static ValidityEnum: {
        DAY: string;
        IOC: string;
      };
      static OrderTypeEnum: {
        MARKET: string;
        LIMIT: string;
        SL: string;
        "SL-M": string;
      };
      static TransactionTypeEnum: {
        BUY: string;
        SELL: string;
      };
    }

    class PlaceOrderV3Request {
      constructor(
        quantity: number,
        product: string,
        validity: string,
        price: number,
        instrumentKey: string,
        orderType: string,
        transactionType: string,
        disclosedQuantity: number,
        triggerPrice: number,
        isAmo: boolean
      );
      slice?: boolean;
    }

    class ModifyOrderV3Request {
      constructor(
        quantity: number,
        validity: string,
        price: number,
        orderId: string,
        orderType: string,
        disclosedQuantity: number,
        triggerPrice: number
      );
    }

    class TokenRequest {
      constructor(
        code: string,
        clientId: string,
        clientSecret: string,
        redirectUri: string,
        grantType: string
      );
    }

    class ConvertPositionRequest {
      constructor(
        instrumentToken: string,
        newProduct: string,
        oldProduct: string,
        quantity: number,
        transactionType: string
      );
    }

    // WebSocket Feeders
    class MarketDataFeederV3 {
      constructor(instrumentKeys: string[], mode: string);
      connect(): Promise<void>;
      disconnect(): void;
      subscribe(instrumentKeys: string[], mode: string): void;
      unsubscribe(instrumentKeys: string[]): void;
      changeMode(instrumentKeys: string[], mode: string): void;
      autoReconnect(
        enable: boolean,
        interval: number,
        retryCount: number
      ): void;
      on(event: string, callback: Function): void;
    }

    class PortfolioDataStreamer {
      constructor();
      connect(): Promise<void>;
      disconnect(): void;
      autoReconnect(
        enable: boolean,
        interval: number,
        retryCount: number
      ): void;
      on(event: string, callback: Function): void;
    }
  }

  export default UpstoxClient;
}
