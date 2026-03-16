import { Module } from "@nestjs/common";
import { AuthModule } from "../../../auth/auth.module";
import { WebSocketModule } from "../../../websocket/websocket.module";
import { UpstoxWebSocketService } from "./upstox-websocket.service";

/**
 * Upstox WebSocket Module
 *
 * Provides real-time market data streaming via WebSocket with:
 * - Multi-token authentication (admin + trader access tokens via AuthModule)
 * - Connection pooling (5 connections for Upstox Plus)
 * - Protobuf decoding (MarketDataFeedV3)
 * - Auto-reconnect with exponential backoff
 * - Heartbeat monitoring
 *
 * NOTE: AuthModule is required because UpstoxWebSocketService selects access tokens
 * from the token pool managed by AuthManagerService. Admin tokens are prioritised
 * for WebSocket connections over trader tokens.
 */
@Module({
  imports: [AuthModule, WebSocketModule],
  providers: [UpstoxWebSocketService],
  exports: [UpstoxWebSocketService],
})
export class UpstoxWebSocketModule {}
