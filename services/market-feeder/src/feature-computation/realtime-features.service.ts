import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { TickData } from '@repo/database';
import Redis from 'ioredis';

@Injectable()
export class RealtimeFeaturesService {
  private readonly logger = new Logger(RealtimeFeaturesService.name);
  
  // Rate limiting logs
  private lastLogTime = 0;
  private ticksProcessed = 0;

  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Listen to raw ticks from the LiveDataService
   * @param tick 
   */
  @OnEvent('market.tick', { async: true })
  async handleMarketTick(tick: TickData) {
    try {
      this.ticksProcessed++;
      
      // Compute lightweight streaming metrics
      // e.g., Order book imbalance
      const totalBid = tick.bidQtys.reduce((sum, q) => sum + q, 0);
      const totalAsk = tick.askQtys.reduce((sum, q) => sum + q, 0);
      const imbalance = totalBid + totalAsk > 0 
        ? (totalBid - totalAsk) / (totalBid + totalAsk) 
        : 0;

      // Realtime state object
      const realtimeState = {
        instrumentKey: tick.instrumentKey,
        timestamp: tick.timestamp.toISOString(),
        ltp: tick.ltp,
        volume: tick.vtt,
        oi: tick.oi,
        imbalance,
        delta: tick.delta || null,
        iv: tick.iv || null,
      };

      // Store in Redis (TTL 1 hour as it's purely for live algorithmic lookup)
      const redisKey = `rt:tick:${tick.instrumentKey}`;
      await this.redisClient.setex(
        redisKey, 
        3600, 
        JSON.stringify(realtimeState)
      );

      // Periodically log throughput
      const now = Date.now();
      if (now - this.lastLogTime > 60000) { // Log every minute
        this.logger.debug(`Processing ~${this.ticksProcessed} ticks/min. Latest: ${tick.instrumentKey} @ ${tick.ltp}`);
        this.ticksProcessed = 0;
        this.lastLogTime = now;
      }
      
    } catch (error) {
      this.logger.error(`Error processing real-time tick for ${tick.instrumentKey}`, error);
    }
  }
}
