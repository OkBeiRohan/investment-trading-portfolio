import { Module, Global } from "@nestjs/common";
import { SocketPoolService } from "./socket-pool.service";
import { SubscriptionManagerService } from "./subscription-manager.service";
import { HeartbeatService } from "./heartbeat.service";

/**
 * WebSocket Module
 *
 * Provides connection pooling and subscription management for all providers.
 *
 * Features:
 * - Connection pooling (5 concurrent for Upstox Plus)
 * - Priority-based subscription
 * - Bin packing algorithm (optimize 5000 instruments/socket)
 * - Auto-reconnect with exponential backoff
 * - Heartbeat monitoring
 */
@Global()
@Module({
  providers: [SocketPoolService, SubscriptionManagerService, HeartbeatService],
  exports: [SocketPoolService, SubscriptionManagerService, HeartbeatService],
})
export class WebSocketModule {}
