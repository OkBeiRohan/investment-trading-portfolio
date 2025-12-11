import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import Redis from "ioredis";
import { RedisKeys } from "./keys.factory";

@Injectable()
//  implements OnModuleInit, OnModuleDestroy
export class RedisService {
  // private publisher: Redis;
  // private subscriber: Redis;
  // private readonly logger = new Logger(RedisService.name);
  // constructor(private configService: ConfigService) {}
  // onModuleInit() {
  //   const host = this.configService.get<string>("REDIS_HOST", "localhost");
  //   const port = this.configService.get<number>("REDIS_PORT", 6379);
  //   // Create two connections: one for general commands/publishing, one for subscribing
  //   this.publisher = new Redis({ host, port });
  //   this.subscriber = new Redis({ host, port });
  //   this.publisher.on("connect", () =>
  //     this.logger.log("Redis Publisher connected")
  //   );
  //   this.publisher.on("error", (err) =>
  //     this.logger.error("Redis Publisher error", err)
  //   );
  // }
  // onModuleDestroy() {
  //   this.publisher.disconnect();
  //   this.subscriber.disconnect();
  // }
  // // --- Multiplexer State Management ---
  // /**
  //  * Maps an instrument key to a socket ID and adds the key to the socket's load set.
  //  * Uses a pipeline for atomicity.
  //  */
  // async setSocketForInstrument(
  //   instrumentKey: string,
  //   socketId: string
  // ): Promise<void> {
  //   const pipeline = this.publisher.pipeline();
  //   // 1. Map the instrument to the socket
  //   pipeline.hset(RedisKeys.INSTRUMENT_MAP, instrumentKey, socketId);
  //   // 2. Add instrument to the socket's own list (for counting load)
  //   pipeline.sadd(RedisKeys.socketKeys(socketId), instrumentKey);
  //   // 3. Ensure socket is in the active list
  //   pipeline.sadd(RedisKeys.ACTIVE_SOCKETS, socketId);
  //   await pipeline.exec();
  // }
  // /**
  //  * Retrieves the socket ID managing a specific instrument.
  //  */
  // async getSocketForInstrument(instrumentKey: string): Promise<string | null> {
  //   return this.publisher.hget(RedisKeys.INSTRUMENT_MAP, instrumentKey);
  // }
  // /**
  //  * Gets the current load (number of subscriptions) for a specific socket.
  //  * Useful for checking capacity before adding new keys.
  //  */
  // async getSocketLoad(socketId: string): Promise<number> {
  //   return this.publisher.scard(RedisKeys.socketKeys(socketId));
  // }
  // /**
  //  * Clean up when a socket disconnects.
  //  * Removes it from active set and clears its load tracking.
  //  * NOTE: You might want to retain the INSTRUMENT_MAP temporarily for recovery logic.
  //  */
  // async removeSocket(socketId: string): Promise<void> {
  //   const pipeline = this.publisher.pipeline();
  //   pipeline.srem(RedisKeys.ACTIVE_SOCKETS, socketId);
  //   pipeline.del(RedisKeys.socketKeys(socketId));
  //   // Logic to clear keys from INSTRUMENT_MAP would go here, likely requiring a loop or Lua script
  //   await pipeline.exec();
  // }
  // // --- Pub/Sub for Market Data ---
  // /**
  //  * Publish a decoded market tick to the system.
  //  */
  // async publishMarketData(data: any): Promise<number> {
  //   // In high-frequency scenarios, consider using MessagePack instead of JSON for serialization
  //   const payload = JSON.stringify(data);
  //   return this.publisher.publish(RedisKeys.MARKET_FEED_CHANNEL, payload);
  // }
  // /**
  //  * Subscribe to the market feed channel.
  //  * Used by consuming apps (Algo Engine, Dashboard).
  //  */
  // subscribeToMarketData(callback: (data: any) => void): void {
  //   this.subscriber.subscribe(RedisKeys.MARKET_FEED_CHANNEL);
  //   this.subscriber.on("message", (channel, message) => {
  //     if (channel === RedisKeys.MARKET_FEED_CHANNEL) {
  //       try {
  //         const data = JSON.parse(message);
  //         callback(data);
  //       } catch (e) {
  //         this.logger.error("Failed to parse market data message", e);
  //       }
  //     }
  //   });
  // }
  // /**
  //  * Health check - ping Redis
  //  */
  // async healthCheck(): Promise<boolean> {
  //   try {
  //     const result = await this.publisher.ping();
  //     return result === "PONG";
  //   } catch (error) {
  //     this.logger.error("Redis health check failed", error);
  //     return false;
  //   }
  // }
}
