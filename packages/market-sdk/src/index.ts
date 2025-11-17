/**
 * @repo/market-sdk
 * Upstox API SDK Wrapper with TypeScript support
 *
 * This package provides a type-safe wrapper around the Upstox API
 * for algorithmic trading with Indian markets (NSE/BSE).
 *
 * Features:
 * - Order placement and management (V3 API)
 * - Real-time market data streaming via WebSocket
 * - Portfolio and position tracking
 * - Option chain and Greeks
 * - Historical data retrieval
 *
 * @example
 * ```typescript
 * import { UpstoxSDK } from '@repo/market-sdk';
 *
 * const upstox = new UpstoxSDK({
 *   apiKey: 'your-api-key',
 *   apiSecret: 'your-api-secret',
 *   redirectUri: 'your-redirect-uri',
 * });
 *
 * // Get authorization URL
 * const authUrl = upstox.getAuthorizationUrl();
 *
 * // Exchange code for token
 * const { accessToken } = await upstox.getAccessToken(code);
 *
 * // Place order
 * const order = await upstox.order.placeOrder({
 *   instrumentKey: 'NSE_EQ|INE669E01016',
 *   quantity: 1,
 *   price: 100,
 *   transactionType: TransactionType.BUY,
 *   orderType: OrderType.LIMIT,
 *   product: ProductType.DELIVERY,
 *   validity: Validity.DAY,
 * });
 *
 * // Stream market data
 * const stream = upstox.createMarketDataStream();
 * stream.onData((data) => {
 *   console.log('Market update:', data);
 * });
 * await stream.connect(['NSE_INDEX|Nifty 50'], MarketDataMode.LTPC);
 * ```
 */

export { UpstoxSDK } from "./client";
export * from "./types";
export * from "./api";
export * from "./websocket";
