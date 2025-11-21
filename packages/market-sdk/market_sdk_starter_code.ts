// ============================================================================
// STARTER CODE FOR @repo/market-sdk
// Implement similar patterns for other APIs (Yahoo, Binance)
// ============================================================================

// -----------------------------------------------------------------------------
// 1. Core Interfaces (src/interfaces/market-data.interface.ts)
// -----------------------------------------------------------------------------
import { Candle, MarketQuote, OptionGreeks } from '@repo/schema';

export interface IMarketDataProvider {
  /**
   * Get last traded price for multiple instruments
   */
  getLTP(instrumentKeys: string[]): Promise<Map<string, number>>;

  /**
   * Get full market quote with depth
   */
  getFullMarketQuote(instrumentKeys: string[]): Promise<MarketQuote[]>;

  /**
   * Get option Greeks (Delta, Gamma, Vega, Theta, IV)
   */
  getOptionGreeks(instrumentKeys: string[]): Promise<Map<string, OptionGreeks>>;

  /**
   * Get historical candle data
   */
  getHistoricalData(params: HistoricalDataParams): Promise<Candle[]>;

  /**
   * Get option chain for an underlying
   */
  getOptionChain(underlying: string, expiry: string): Promise<OptionChainData[]>;
}

export interface HistoricalDataParams {
  instrumentKey: string;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  startDate: Date;
  endDate: Date;
}

// -----------------------------------------------------------------------------
// 2. Core Interfaces (src/interfaces/orders.interface.ts)
// -----------------------------------------------------------------------------
import { Order, OrderParams } from '@repo/schema';

export interface IOrderProvider {
  /**
   * Place a single order
   */
  placeOrder(userId: string, params: OrderParams): Promise<Order>;

  /**
   * Place multi-leg order (straddle, iron condor, etc.)
   */
  placeMultiLegOrder(userId: string, params: MultiLegOrderParams): Promise<Order>;

  /**
   * Modify existing order
   */
  modifyOrder(userId: string, orderId: string, modifications: Partial<OrderParams>): Promise<Order>;

  /**
   * Cancel order
   */
  cancelOrder(userId: string, orderId: string): Promise<{ success: boolean }>;

  /**
   * Get order book (all orders for user)
   */
  getOrderBook(userId: string): Promise<Order[]>;

  /**
   * Get specific order details
   */
  getOrderDetails(userId: string, orderId: string): Promise<Order>;
}

// -----------------------------------------------------------------------------
// 3. Auth Manager (Multi-User) - src/auth/auth-manager.service.ts
// -----------------------------------------------------------------------------
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpstoxToken, UpstoxTokenDocument } from '@repo/database';
import { EncryptionUtil } from './encryption.util';
import { UpstoxEnv } from '@repo/schema';
import axios from 'axios';

@Injectable()
export class AuthManagerService {
  constructor(
    @InjectModel(UpstoxToken.name) private tokenModel: Model<UpstoxTokenDocument>,
    private encryption: EncryptionUtil,
  ) {}

  /**
   * Get decrypted access token for a user
   */
  async getAccessToken(userId: string, env: UpstoxEnv): Promise<string> {
    const tokenRecord = await this.tokenModel.findOne({ userId, environment: env });

    if (!tokenRecord) {
      throw new UnauthorizedException(
        `No ${env} token found for user ${userId}. Please link Upstox account.`
      );
    }

    // Check expiry (only for LIVE)
    if (env === UpstoxEnv.LIVE && new Date() > tokenRecord.expiry) {
      throw new UnauthorizedException('Upstox session expired. Please re-authenticate.');
    }

    // Decrypt token
    return this.encryption.decrypt(
      tokenRecord.encryptedAccessToken,
      tokenRecord.iv,
      tokenRecord.authTag,
    );
  }

  /**
   * SANDBOX: User manually pastes token from Upstox Dashboard
   */
  async saveSandboxToken(userId: string, rawToken: string): Promise<void> {
    const { encrypted, iv, tag } = this.encryption.encrypt(rawToken);

    await this.tokenModel.findOneAndUpdate(
      { userId, environment: UpstoxEnv.SANDBOX },
      {
        userId,
        upstoxUserId: 'SANDBOX_USER',
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        environment: UpstoxEnv.SANDBOX,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      { upsert: true, new: true },
    );
  }

  /**
   * LIVE: Handle OAuth2 callback after user authorizes
   */
  async handleLiveCallback(
    userId: string,
    authCode: string,
    config: { apiKey: string; apiSecret: string; redirectUri: string }
  ): Promise<void> {
    // Exchange code for token
    const params = new URLSearchParams({
      code: authCode,
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await axios.post(
      'https://api.upstox.com/v2/login/authorization/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, user_id, expires_in } = response.data;

    // Encrypt and store
    const { encrypted, iv, tag } = this.encryption.encrypt(access_token);

    await this.tokenModel.findOneAndUpdate(
      { userId, environment: UpstoxEnv.LIVE },
      {
        userId,
        upstoxUserId: user_id,
        encryptedAccessToken: encrypted,
        iv,
        authTag: tag,
        environment: UpstoxEnv.LIVE,
        expiry: new Date(Date.now() + expires_in * 1000),
      },
      { upsert: true, new: true },
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthorizationUrl(apiKey: string, redirectUri: string): string {
    return `https://api.upstox.com/v2/login/authorization/dialog?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  }
}

// -----------------------------------------------------------------------------
// 4. Encryption Utility - src/auth/encryption.util.ts
// -----------------------------------------------------------------------------
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('ENCRYPTION_KEY');
    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters');
    }
    this.secretKey = Buffer.from(key, 'utf-8');
  }

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
    };
  }

  decrypt(encrypted: string, ivHex: string, tagHex: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(ivHex, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// -----------------------------------------------------------------------------
// 5. Multiplexer Service - src/multiplexer/multiplexer.service.ts
// -----------------------------------------------------------------------------
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@repo/database';
import { SocketPool } from './socket-pool';
import { BinPacker } from './bin-packer';
import { SubscriptionManager } from './subscription-manager';
import { PriorityLevel, SubscriptionRequest } from './types';

@Injectable()
export class MultiplexerService {
  private readonly logger = new Logger(MultiplexerService.name);
  private readonly MAX_SOCKETS = 5; // Upstox Plus limit

  constructor(
    private socketPool: SocketPool,
    private binPacker: BinPacker,
    private subscriptionManager: SubscriptionManager,
    private redis: RedisService,
  ) {}

  /**
   * Subscribe to instruments with priority-based allocation
   */
  async subscribe(
    userId: string,
    instrumentKeys: string[],
    priority: PriorityLevel = PriorityLevel.MEDIUM,
  ): Promise<void> {
    const requests: SubscriptionRequest[] = instrumentKeys.map(key => ({
      instrumentKey: key,
      priority,
      userId,
    }));

    // Check which are already subscribed
    const newRequests: SubscriptionRequest[] = [];
    for (const req of requests) {
      const existing = await this.redis.getSocketForInstrument(req.instrumentKey);
      if (!existing) {
        newRequests.push(req);
      }
    }

    if (newRequests.length === 0) {
      this.logger.debug('All instruments already subscribed');
      return;
    }

    // Get current socket states
    const sockets = this.socketPool.getSockets();

    // Run bin packing algorithm
    const { assignments, evictions, unfulfilled } = this.binPacker.allocate(
      newRequests,
      sockets.map(s => ({
        id: s.id,
        load: s.getLoad(),
        capacity: s.getCapacity(),
        keys: s.getSubscribedKeys(),
      })),
    );

    // Execute evictions
    for (const key of evictions) {
      await this.unsubscribe(key);
    }

    // Execute assignments
    for (const [socketId, keys] of assignments) {
      const socket = this.socketPool.getSocket(socketId);
      if (socket) {
        await socket.subscribe(keys);
        for (const key of keys) {
          await this.redis.setSocketForInstrument(key, socketId);
          await this.subscriptionManager.track(userId, key, priority);
        }
      }
    }

    // Create new sockets if needed
    if (unfulfilled.length > 0 && this.socketPool.size() < this.MAX_SOCKETS) {
      const newSocket = await this.socketPool.createSocket(userId);
      const keysToSubscribe = unfulfilled.slice(0, newSocket.getCapacity());
      await newSocket.subscribe(keysToSubscribe);
      
      for (const key of keysToSubscribe) {
        await this.redis.setSocketForInstrument(key, newSocket.id);
        await this.subscriptionManager.track(userId, key, priority);
      }
    }

    this.logger.log(
      `Subscribed ${newRequests.length - unfulfilled.length}/${newRequests.length} instruments for user ${userId}`,
    );
  }

  /**
   * Unsubscribe from instruments
   */
  async unsubscribe(instrumentKey: string): Promise<void> {
    const socketId = await this.redis.getSocketForInstrument(instrumentKey);
    if (!socketId) return;

    const socket = this.socketPool.getSocket(socketId);
    if (socket) {
      await socket.unsubscribe([instrumentKey]);
      await this.redis.removeInstrumentMapping(instrumentKey);
      await this.subscriptionManager.remove(instrumentKey);
    }
  }

  /**
   * Listen to market data events
   */
  on(event: 'data', callback: (data: any) => void): void {
    // Subscribe to Redis pub/sub channel
    this.redis.subscribeToMarketData(callback);
  }
}

// -----------------------------------------------------------------------------
// 6. Upstox Provider - src/providers/upstox/upstox.provider.ts
// -----------------------------------------------------------------------------
import { Injectable } from '@nestjs/common';
import { IMarketDataProvider, IOrderProvider, IPortfolioProvider } from '../../interfaces';
import { AuthManagerService } from '../../auth/auth-manager.service';
import { MarketDataApi } from './api/market-data.api';
import { OrdersApi } from './api/orders.api';
import { PortfolioApi } from './api/portfolio.api';
import { UpstoxEnv } from '@repo/schema';

@Injectable()
export class UpstoxProvider implements IMarketDataProvider, IOrderProvider, IPortfolioProvider {
  constructor(
    private authManager: AuthManagerService,
    private marketDataApi: MarketDataApi,
    private ordersApi: OrdersApi,
    private portfolioApi: PortfolioApi,
  ) {}

  // ---- IMarketDataProvider Implementation ----

  async getLTP(instrumentKeys: string[]): Promise<Map<string, number>> {
    // This is called WITHOUT userId - used for general market data
    // Use a system-level token or first available user token
    return this.marketDataApi.getLTP(instrumentKeys);
  }

  async getFullMarketQuote(instrumentKeys: string[]): Promise<MarketQuote[]> {
    return this.marketDataApi.getFullMarketQuote(instrumentKeys);
  }

  async getOptionGreeks(instrumentKeys: string[]): Promise<Map<string, OptionGreeks>> {
    return this.marketDataApi.getOptionGreeks(instrumentKeys);
  }

  async getHistoricalData(params: HistoricalDataParams): Promise<Candle[]> {
    return this.marketDataApi.getHistoricalData(params);
  }

  async getOptionChain(underlying: string, expiry: string): Promise<OptionChainData[]> {
    return this.marketDataApi.getOptionChain(underlying, expiry);
  }

  // ---- IOrderProvider Implementation ----

  async placeOrder(userId: string, params: OrderParams): Promise<Order> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.placeOrder(token, params);
  }

  async placeMultiLegOrder(userId: string, params: MultiLegOrderParams): Promise<Order> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.placeMultiLegOrder(token, params);
  }

  async modifyOrder(userId: string, orderId: string, modifications: Partial<OrderParams>): Promise<Order> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.modifyOrder(token, orderId, modifications);
  }

  async cancelOrder(userId: string, orderId: string): Promise<{ success: boolean }> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.cancelOrder(token, orderId);
  }

  async getOrderBook(userId: string): Promise<Order[]> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.getOrderBook(token);
  }

  async getOrderDetails(userId: string, orderId: string): Promise<Order> {
    const token = await this.authManager.getAccessToken(userId, UpstoxEnv.LIVE);
    return this.ordersApi.getOrderDetails(token, orderId);
  }

  // ---- IPortfolioProvider Implementation ----
  // Similar pattern...
}

// -----------------------------------------------------------------------------
// 7. Orders API - src/providers/upstox/api/orders.api.ts
// -----------------------------------------------------------------------------
import { Injectable, Logger, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Order, OrderParams } from '@repo/schema';

@Injectable()
export class OrdersApi {
  private readonly logger = new Logger(OrdersApi.name);
  private readonly baseUrl = 'https://api.upstox.com/v2';
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
    });
  }

  /**
   * Place a single order
   */
  async placeOrder(accessToken: string, params: OrderParams): Promise<Order> {
    try {
      const response = await this.axiosInstance.post(
        '/order/place',
        {
          quantity: params.quantity,
          product: params.product,
          validity: params.validity,
          price: params.price,
          tag: params.tag,
          instrument_token: params.instrumentKey,
          order_type: params.orderType,
          transaction_type: params.transactionType,
          disclosed_quantity: params.disclosedQuantity,
          trigger_price: params.triggerPrice,
          is_amo: params.isAMO,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );

      this.logger.log(`Order placed: ${response.data.data.order_id}`);
      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Place multi-leg order (e.g., straddle, iron condor)
   */
  async placeMultiLegOrder(accessToken: string, params: MultiLegOrderParams): Promise<Order> {
    try {
      const response = await this.axiosInstance.post(
        '/order/multi/place',
        {
          orders: params.legs.map(leg => ({
            quantity: leg.quantity,
            product: leg.product,
            validity: leg.validity,
            price: leg.price,
            instrument_token: leg.instrumentKey,
            order_type: leg.orderType,
            transaction_type: leg.transactionType,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Modify existing order
   */
  async modifyOrder(
    accessToken: string,
    orderId: string,
    modifications: Partial<OrderParams>
  ): Promise<Order> {
    try {
      const response = await this.axiosInstance.put(
        '/order/modify',
        {
          order_id: orderId,
          ...modifications,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return this.mapToOrder(response.data.data);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(accessToken: string, orderId: string): Promise<{ success: boolean }> {
    try {
      await this.axiosInstance.delete(`/order/cancel`, {
        params: { order_id: orderId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(`Order cancelled: ${orderId}`);
      return { success: true };
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Get order book (all orders)
   */
  async getOrderBook(accessToken: string): Promise<Order[]> {
    try {
      const response = await this.axiosInstance.get('/order/retrieve-all', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data.map(this.mapToOrder);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  /**
   * Get specific order details
   */
  async getOrderDetails(accessToken: string, orderId: string): Promise<Order> {
    try {
      const response = await this.axiosInstance.get('/order/history', {
        params: { order_id: orderId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return this.mapToOrder(response.data.data[0]);
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // ---- Helper Methods ----

  private mapToOrder(data: any): Order {
    return {
      orderId: data.order_id,
      instrumentKey: data.instrument_token,
      quantity: data.quantity,
      price: data.price,
      orderType: data.order_type,
      transactionType: data.transaction_type,
      status: data.status,
      filledQuantity: data.filled_quantity,
      averagePrice: data.average_price,
      createdAt: new Date(data.order_timestamp),
      updatedAt: new Date(data.order_timestamp),
    };
  }

  private handleError(error: any): never {
    const msg = error.response?.data?.errors?.[0]?.message || error.message;
    this.logger.error(`Upstox API Error: ${msg}`);
    throw new HttpException(
      {
        status: 'API_ERROR',
        message: msg,
        upstoxError: error.response?.data,
      },
      error.response?.status || 500,
    );
  }
}

// -----------------------------------------------------------------------------
// 8. Market Data API - src/providers/upstox/api/market-data.api.ts
// -----------------------------------------------------------------------------
// Similar implementation pattern as OrdersApi
// Implement: getLTP, getFullMarketQuote, getOptionGreeks, getHistoricalData, etc.

// -----------------------------------------------------------------------------
// 9. Upstox Module - src/providers/upstox/upstox.module.ts
// -----------------------------------------------------------------------------
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, UpstoxToken, UpstoxTokenSchema } from '@repo/database';

import { AuthManagerService } from '../../auth/auth-manager.service';
import { EncryptionUtil } from '../../auth/encryption.util';
import { MultiplexerService } from '../../multiplexer/multiplexer.service';
import { SocketPool } from '../../multiplexer/socket-pool';
import { BinPacker } from '../../multiplexer/bin-packer';
import { SubscriptionManager } from '../../multiplexer/subscription-manager';
import { UpstoxProvider } from './upstox.provider';
import { MarketDataApi } from './api/market-data.api';
import { OrdersApi } from './api/orders.api';
import { PortfolioApi } from './api/portfolio.api';

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: UpstoxToken.name, schema: UpstoxTokenSchema },
    ]),
  ],
  providers: [
    // Auth
    AuthManagerService,
    EncryptionUtil,
    
    // Multiplexer
    MultiplexerService,
    SocketPool,
    BinPacker,
    SubscriptionManager,
    
    // Provider & APIs
    UpstoxProvider,
    MarketDataApi,
    OrdersApi,
    PortfolioApi,
  ],
  exports: [
    AuthManagerService,
    MultiplexerService,
    UpstoxProvider,
  ],
})
export class UpstoxModule {}

// -----------------------------------------------------------------------------
// 10. Provider Factory - src/core/provider.factory.ts
// -----------------------------------------------------------------------------
import { UpstoxProvider } from '../providers/upstox/upstox.provider';
import { YahooProvider } from '../providers/yahoo/yahoo.provider';
import { BinanceProvider } from '../providers/binance/binance.provider';

export type ProviderType = 'upstox' | 'yahoo' | 'binance';

export class ProviderFactory {
  private static instances = new Map<ProviderType, any>();

  static create(type: ProviderType, config?: any): any {
    // Singleton pattern (optional)
    if (this.instances.has(type)) {
      return this.instances.get(type);
    }

    let provider: any;
    switch (type) {
      case 'upstox':
        provider = new UpstoxProvider(/* inject dependencies */);
        break;
      case 'yahoo':
        provider = new YahooProvider(/* inject dependencies */);
        break;
      case 'binance':
        provider = new BinanceProvider(/* inject dependencies */);
        break;
      default:
        throw new Error(`Unknown provider: ${type}`);
    }

    this.instances.set(type, provider);
    return provider;
  }

  /**
   * Auto-detect provider based on instrument key
   */
  static getProviderForInstrument(instrumentKey: string): ProviderType {
    if (instrumentKey.startsWith('NSE_') || instrumentKey.startsWith('BSE_')) {
      return 'upstox';
    }
    if (instrumentKey.includes('BTC') || instrumentKey.includes('ETH')) {
      return 'binance';
    }
    return 'yahoo'; // Default for stocks
  }
}

// -----------------------------------------------------------------------------
// 11. Main Index - src/index.ts
// -----------------------------------------------------------------------------
// Interfaces
export * from './interfaces/market-data.interface';
export * from './interfaces/orders.interface';
export * from './interfaces/portfolio.interface';

// Core
export * from './core/provider.factory';
export * from './core/errors';

// Auth
export * from './auth/auth-manager.service';

// Multiplexer
export * from './multiplexer/multiplexer.service';
export * from './multiplexer/types';

// Providers
export { UpstoxProvider } from './providers/upstox/upstox.provider';
export { UpstoxModule } from './providers/upstox/upstox.module';
export { YahooProvider } from './providers/yahoo/yahoo.provider';
export { BinanceProvider } from './providers/binance/binance.provider';

// ============================================================================
// USAGE EXAMPLE IN APP
// ============================================================================

/**
 * Example: Using market-sdk in algo-worker
 * 
 * // apps/algo-worker/src/app.module.ts
 * import { Module } from '@nestjs/common';
 * import { UpstoxModule } from '@repo/market-sdk';
 * 
 * @Module({
 *   imports: [
 *     UpstoxModule, // Register Upstox provider
 *   ],
 * })
 * export class AppModule {}
 * 
 * // apps/algo-worker/src/engines/data/market-connector.service.ts
 * import { Injectable } from '@nestjs/common';
 * import { UpstoxProvider, MultiplexerService, PriorityLevel } from '@repo/market-sdk';
 * 
 * @Injectable()
 * export class MarketConnectorService {
 *   constructor(
 *     private upstox: UpstoxProvider,
 *     private multiplexer: MultiplexerService,
 *   ) {}
 * 
 *   async subscribeToMarketData(userId: string) {
 *     // Get Nifty 50 option chain
 *     const chain = await this.upstox.getOptionChain('NSE_INDEX|Nifty 50', '2024-12-26');
 * 
 *     // Subscribe with priorities
 *     const instruments = chain.map(opt => opt.instrumentKey);
 *     await this.multiplexer.subscribe(userId, instruments, PriorityLevel.HIGH);
 * 
 *     // Listen to market data
 *     this.multiplexer.on('data', (data) => {
 *       console.log('Received market data:', data);
 *     });
 *   }
 * 
 *   async placeOrder(userId: string) {
 *     const order = await this.upstox.placeOrder(userId, {
 *       instrumentKey: 'NSE_EQ|INE669E01016',
 *       quantity: 10,
 *       price: 0,
 *       transactionType: 'BUY',
 *       orderType: 'MARKET',
 *       product: 'DELIVERY',
 *       validity: 'DAY',
 *     });
 * 
 *     console.log('Order placed:', order.orderId);
 *   }
 * }
 */
