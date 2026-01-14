/**
 * Complete Usage Example - Market SDK with Upstox Provider
 *
 * This example demonstrates:
 * 1. Multi-tenant token management (Redis + MongoDB)
 * 2. Market data fetching (quotes, candles)
 * 3. Order placement (with SEBI compliance)
 * 4. Portfolio management
 * 5. Sandbox/Live mode switching
 * 6. Rate limiting and circuit breaker
 */

import { Module, Injectable, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

// Market SDK imports
import { CoreModule } from "@repo/market-sdk/core/core.module";
import { AuthModule } from "@repo/market-sdk/auth/auth.module";
import { UpstoxApiModule } from "@repo/market-sdk/providers/upstox/api/api.module";

// Service imports
import { MarketDataService } from "@repo/market-sdk/providers/upstox/api/market-data/market-data.service";
import { UpstoxHistoricalAPIService } from "@repo/market-sdk/providers/upstox/api/historical/historical.service";
import { OrdersService } from "@repo/market-sdk/providers/upstox/api/orders/orders.service";
import { PortfolioService } from "@repo/market-sdk/providers/upstox/api/portfolio/portfolio.service";

// ============================================================================
// 1. APP MODULE SETUP
// ============================================================================

@Module({
  imports: [
    ConfigModule.forRoot(),

    // Market SDK core modules (Global)
    CoreModule, // Provides: HttpClientService, RateLimiterService, CircuitBreakerService
    AuthModule, // Provides: AuthManagerService with Redis + MongoDB

    // Upstox provider
    UpstoxApiModule, // Cascading modules: MarketData, Historical, Orders, Portfolio
  ],
  providers: [AlgoTradingService, MultiUserTradingService],
})
export class AppModule {}

// ============================================================================
// 2. ALGO TRADING SERVICE - Complete Trading Workflow
// ============================================================================

@Injectable()
export class AlgoTradingService {
  private readonly logger = new Logger(AlgoTradingService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly historical: UpstoxHistoricalAPIService,
    private readonly orders: OrdersService,
    private readonly portfolio: PortfolioService
  ) {}

  /**
   * Complete trading workflow:
   * 1. Fetch real-time quotes
   * 2. Get historical candles for strategy
   * 3. Place order based on signal
   * 4. Monitor positions
   */
  async runStraddleStrategy(userId: string) {
    try {
      // Step 1: Get NIFTY spot price
      const spotPrices = await this.marketData.getLTP(userId, [
        "NSE_INDEX|Nifty 50", // NIFTY index
      ]);

      const niftySpot = spotPrices.get("NSE_INDEX|Nifty 50");
      this.logger.log(`NIFTY Spot: ${niftySpot}`);

      // Step 2: Get ATM strike for straddle
      const atmStrike = Math.round(niftySpot / 50) * 50; // Round to nearest 50

      // Step 3: Get option chain
      const optionChain = await this.marketData.getOptionChain(
        userId,
        "NSE_FO|NIFTY",
        "2024-12-26" // Expiry date
      );

      // Step 4: Identify ATM call and put
      const atmCall = `NSE_FO|NIFTY24DEC${atmStrike}CE`;
      const atmPut = `NSE_FO|NIFTY24DEC${atmStrike}PE`;

      // Step 5: Get premiums
      const premiums = await this.marketData.getLTP(userId, [atmCall, atmPut]);
      const callPremium = premiums.get(atmCall);
      const putPremium = premiums.get(atmPut);

      this.logger.log(`ATM Strike: ${atmStrike}`);
      this.logger.log(
        `Call Premium: ${callPremium}, Put Premium: ${putPremium}`
      );

      // Step 6: Check current positions
      const positions = await this.portfolio.getPositions(userId);
      this.logger.log(`Current positions: ${positions.length}`);

      // Step 7: Place straddle orders (BUY ATM call + BUY ATM put)
      const callOrder = await this.orders.placeOrder(userId, {
        quantity: 50, // 1 lot
        product: "I", // Intraday
        validity: "DAY",
        instrument_token: atmCall,
        order_type: "MARKET",
        transaction_type: "BUY",
        is_amo: false,
        tag: "ALGO-STRADDLE-V1.2.3", // SEBI compliance
      });

      const putOrder = await this.orders.placeOrder(userId, {
        quantity: 50,
        product: "I",
        validity: "DAY",
        instrument_token: atmPut,
        order_type: "MARKET",
        transaction_type: "BUY",
        is_amo: false,
        tag: "ALGO-STRADDLE-V1.2.3",
      });

      this.logger.log("Straddle placed successfully", {
        callOrderId: callOrder.order_id,
        putOrderId: putOrder.order_id,
      });

      return { callOrder, putOrder };
    } catch (error) {
      this.logger.error("Strategy execution failed", error);
      throw error;
    }
  }

  /**
   * Backtest strategy using historical data
   */
  async backtestStrategy(userId: string) {
    // Get 1-minute candles for last 30 days
    const candles = await this.historical.getHistoricalCandles(
      userId,
      "NSE_INDEX|Nifty 50",
      "1minute",
      "2024-11-01",
      "2024-11-30"
    );

    this.logger.log(`Fetched ${candles.length} candles for backtesting`);

    // Backtest logic here
    candles.forEach((candle, i) => {
      // Example: Simple moving average crossover
      if (i > 20) {
        const sma20 =
          candles.slice(i - 20, i).reduce((sum, c) => sum + c.close, 0) / 20;

        if (candle.close > sma20) {
          // Buy signal
          this.logger.debug(
            `BUY signal at ${candle.timestamp}: ${candle.close}`
          );
        }
      }
    });
  }
}

// ============================================================================
// 3. MULTI-USER TRADING SERVICE - Tenant Isolation
// ============================================================================

@Injectable()
export class MultiUserTradingService {
  private readonly logger = new Logger(MultiUserTradingService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly orders: OrdersService
  ) {}

  /**
   * Process orders for multiple users (multi-tenant)
   * Each user has their own access token (Redis + MongoDB)
   */
  async processMultiUserOrders() {
    const users = [
      { userId: "user-001", instruments: ["NSE_EQ|INE002A01018"] }, // Reliance
      { userId: "user-002", instruments: ["NSE_EQ|INE040A01034"] }, // HDFC Bank
      { userId: "user-003", instruments: ["NSE_EQ|INE467B01029"] }, // TCS
    ];

    // Parallel processing with per-user rate limiting
    const results = await Promise.all(
      users.map(async ({ userId, instruments }) => {
        try {
          // Each user has separate token (cached in Redis)
          const ltpMap = await this.marketData.getLTP(userId, instruments);

          this.logger.log(`User ${userId} - LTP fetched:`, ltpMap);

          // Place order for user
          if (ltpMap.size > 0) {
            const instrument = instruments[0];
            const ltp = ltpMap.get(instrument);

            const order = await this.orders.placeOrder(userId, {
              quantity: 1,
              product: "D", // Delivery
              validity: "DAY",
              price: ltp * 0.99, // Limit order at 1% below LTP
              instrument_token: instrument,
              order_type: "LIMIT",
              transaction_type: "BUY",
              is_amo: false,
            });

            return { userId, orderId: order.order_id, success: true };
          }
        } catch (error) {
          this.logger.error(`User ${userId} failed:`, error.message);
          return { userId, error: error.message, success: false };
        }
      })
    );

    return results;
  }
}

// ============================================================================
// 4. SANDBOX MODE - Safe Testing
// ============================================================================

@Injectable()
export class SandboxTestingService {
  private readonly logger = new Logger(SandboxTestingService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly orders: OrdersService
  ) {}

  /**
   * Test in sandbox mode before going live
   * Note: Repositories support environment parameter
   */
  async testSandboxMode(userId: string) {
    // In production, you'd configure this via environment variables
    // For now, repositories accept environment parameter

    this.logger.log("Testing in SANDBOX mode...");

    // Market data fetch (sandbox)
    const ltpMap = await this.marketData.getLTP(userId, [
      "NSE_EQ|INE002A01018",
    ]);

    this.logger.log("Sandbox LTP:", ltpMap);

    // Place test order in sandbox
    // NOTE: Service layer would need to expose environment parameter
    // or be configured globally
  }
}

// ============================================================================
// 5. ERROR HANDLING & RESILIENCE
// ============================================================================

@Injectable()
export class ResilientTradingService {
  private readonly logger = new Logger(ResilientTradingService.name);

  constructor(
    private readonly marketData: MarketDataService,
    private readonly orders: OrdersService
  ) {}

  /**
   * Demonstrates automatic retries and circuit breaker
   */
  async placeOrderWithRetry(userId: string) {
    try {
      // HttpClientService automatically:
      // 1. Retries on 429 (rate limit) - exponential backoff
      // 2. Retries on 5xx (server error) - 3 attempts
      // 3. Opens circuit breaker after 5 consecutive failures

      const order = await this.orders.placeOrder(userId, {
        quantity: 1,
        product: "I",
        validity: "DAY",
        instrument_token: "NSE_EQ|INE002A01018",
        order_type: "MARKET",
        transaction_type: "BUY",
        is_amo: false,
      });

      return order;
    } catch (error) {
      // Error types:
      // - RateLimitExceededError (429)
      // - UnauthorizedError (401) - Token expired
      // - ServiceUnavailableError (503) - Circuit breaker open

      if (error.name === "UnauthorizedError") {
        this.logger.error("Token expired, invalidating cache...");
        // AuthManager will auto-refresh on next call
      }

      throw error;
    }
  }
}

// ============================================================================
// 6. PORTFOLIO MONITORING
// ============================================================================

@Injectable()
export class PortfolioMonitorService {
  private readonly logger = new Logger(PortfolioMonitorService.name);

  constructor(
    private readonly portfolio: PortfolioService,
    private readonly marketData: MarketDataService
  ) {}

  /**
   * Real-time PnL tracking
   */
  async calculateRealTimePnL(userId: string) {
    // Get all open positions
    const positions = await this.portfolio.getPositions(userId);

    if (positions.length === 0) {
      this.logger.log("No open positions");
      return { totalPnL: 0, positions: [] };
    }

    // Extract instruments from positions
    const instruments = positions.map((p) => p.instrument_token);

    // Get current LTP for all instruments
    const ltpMap = await this.marketData.getLTP(userId, instruments);

    // Calculate PnL for each position
    const positionsWithPnL = positions.map((position) => {
      const currentPrice = ltpMap.get(position.instrument_token);
      const pnl = (currentPrice - position.average_price) * position.quantity;

      return {
        symbol: position.tradingsymbol,
        quantity: position.quantity,
        avgPrice: position.average_price,
        ltp: currentPrice,
        pnl,
        pnlPercent: (pnl / (position.average_price * position.quantity)) * 100,
      };
    });

    const totalPnL = positionsWithPnL.reduce((sum, p) => sum + p.pnl, 0);

    this.logger.log(`Total PnL: ₹${totalPnL.toFixed(2)}`);

    return { totalPnL, positions: positionsWithPnL };
  }

  /**
   * Check available margin
   */
  async checkMargin(userId: string) {
    const funds = await this.portfolio.getFunds(userId);

    this.logger.log("Available margin:", {
      equity: funds.equity?.available_margin || 0,
      commodity: funds.commodity?.available_margin || 0,
    });

    return funds;
  }
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export {
  AlgoTradingService,
  MultiUserTradingService,
  SandboxTestingService,
  ResilientTradingService,
  PortfolioMonitorService,
};
