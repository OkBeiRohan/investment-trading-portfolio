import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@repo/database";
import { WebSocketError } from "../core/error";
import { SocketMetrics } from "./types";
import WebSocket from "ws";

export interface Socket {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  capacity: number;
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class SocketPool {
  private readonly logger = new Logger(SocketPool.name);
  private sockets = new Map<string, Socket>();
  private readonly DEFAULT_CAPACITY = 3000;

  constructor(private redis: RedisService) {}

  // async createSocket(
  //   userId: string,
  //   capacity: number = this.DEFAULT_CAPACITY
  // ): Promise<Socket> {
  //   const socketId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  //   // WebSocket connection will be established by the provider
  //   const socket: Socket = {
  //     id: socketId,
  //     ws: null as any, // Will be set by provider
  //     subscriptions: new Set(),
  //     capacity,
  //     createdAt: new Date(),
  //     lastActivity: new Date(),
  //   };

  //   this.sockets.set(socketId, socket);
  //   await this.redis.sAdd("upstox:sockets:active", socketId);

  //   this.logger.log(`Created socket ${socketId} with capacity ${capacity}`);
  //   return socket;
  // }

  // getSocket(socketId: string): Socket | undefined {
  //   return this.sockets.get(socketId);
  // }

  // getSockets(): Socket[] {
  //   return Array.from(this.sockets.values());
  // }

  // async removeSocket(socketId: string): Promise<void> {
  //   const socket = this.sockets.get(socketId);
  //   if (socket) {
  //     if (socket.ws && socket.ws.readyState === WebSocket.OPEN) {
  //       socket.ws.close();
  //     }

  //     // Clean up subscriptions
  //     for (const key of socket.subscriptions) {
  //       await this.redis.removeInstrumentMapping(key);
  //     }

  //     this.sockets.delete(socketId);
  //     await this.redis.sRem("upstox:sockets:active", socketId);
  //     this.logger.log(`Removed socket ${socketId}`);
  //   }
  // }

  // size(): number {
  //   return this.sockets.size;
  // }

  // getMetrics(): SocketMetrics[] {
  //   return Array.from(this.sockets.values()).map((socket) => ({
  //     id: socket.id,
  //     load: socket.subscriptions.size,
  //     capacity: socket.capacity,
  //     utilization: (socket.subscriptions.size / socket.capacity) * 100,
  //     subscriptions: socket.subscriptions.size,
  //     connectedAt: socket.createdAt,
  //     lastActivity: socket.lastActivity,
  //   }));
  // }

  // async cleanup(): Promise<void> {
  //   const socketIds = Array.from(this.sockets.keys());
  //   for (const socketId of socketIds) {
  //     await this.removeSocket(socketId);
  //   }
  //   this.logger.log("Socket pool cleaned up");
  // }
}
