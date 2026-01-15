import { Module } from "@nestjs/common";
import { WebSocketModule } from "../../../websocket/websocket.module";
import { UpstoxWebSocketService } from "./upstox-websocket.service";

/**
 * Upstox WebSocket Module
 *
 * Provides real-time market data streaming via WebSocket with:
 * - Connection pooling (5 connections)
 * - Protobuf decoding
 * - Auto-reconnect
 * - Heartbeat monitoring
 */
@Module({
  imports: [WebSocketModule],
  providers: [UpstoxWebSocketService],
  exports: [UpstoxWebSocketService],
})
export class UpstoxWebSocketModule {}
