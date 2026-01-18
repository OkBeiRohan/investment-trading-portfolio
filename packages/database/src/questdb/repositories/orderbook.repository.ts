/**
 * Orderbook L2 Repository v3.0
 * Repository for Level 2 order book depth snapshots
 * Stores bid/ask depth-5 data for futures and options
 */

import { Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { OrderbookL2Snapshot, OrderbookL2SnapshotSchema } from "@repo/schema";

@Injectable()
export class OrderbookRepository {
  private readonly logger = new Logger(OrderbookRepository.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Insert orderbook snapshots batch
   * @param snapshots Array of L2 snapshots (bid/ask at each level)
   */
  async insertBatch(snapshots: OrderbookL2Snapshot[]): Promise<void> {
    if (snapshots.length === 0) return;

    const values = snapshots
      .map((s) => {
        const v = OrderbookL2SnapshotSchema.parse(s);
        return `('${v.timestamp.toISOString()}', '${v.instrumentKey}', '${v.side}', ${v.level}, ${v.price}, ${v.quantity}, ${v.orders ?? "NULL"})`;
      })
      .join(",");

    const query = `INSERT INTO orderbook_l2_snapshots (timestamp, instrument_key, side, level, price, quantity, orders) VALUES ${values}`;
    await this.pool.query(query);
    this.logger.log(`Inserted ${snapshots.length} orderbook snapshots`);
  }

  /**
   * Insert depth-5 data from Upstox market quote
   * Converts the depth object into individual L2 snapshot rows
   */
  async insertDepth5(
    timestamp: Date,
    instrumentKey: string,
    depth: {
      buy: Array<{ quantity: number; price: number; orders: number }>;
      sell: Array<{ quantity: number; price: number; orders: number }>;
    },
  ): Promise<void> {
    const snapshots: OrderbookL2Snapshot[] = [];

    // Process buy side (bids)
    depth.buy.forEach((level, index) => {
      if (level.price > 0) {
        snapshots.push({
          timestamp,
          instrumentKey,
          side: "bid",
          level: index + 1,
          price: level.price,
          quantity: level.quantity,
          orders: level.orders,
        });
      }
    });

    // Process sell side (asks)
    depth.sell.forEach((level, index) => {
      if (level.price > 0) {
        snapshots.push({
          timestamp,
          instrumentKey,
          side: "ask",
          level: index + 1,
          price: level.price,
          quantity: level.quantity,
          orders: level.orders,
        });
      }
    });

    if (snapshots.length > 0) {
      await this.insertBatch(snapshots);
    }
  }

  /**
   * Get latest orderbook snapshot for instrument
   */
  async getLatest(instrumentKey: string): Promise<OrderbookL2Snapshot[]> {
    const result = await this.pool.query(
      `SELECT * FROM orderbook_l2_snapshots 
       WHERE instrument_key = $1 
       ORDER BY timestamp DESC, level ASC 
       LIMIT 10`,
      [instrumentKey],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Get orderbook snapshots for time range
   */
  async findByTimeRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date,
    limit = 1000,
  ): Promise<OrderbookL2Snapshot[]> {
    const result = await this.pool.query(
      `SELECT * FROM orderbook_l2_snapshots 
       WHERE instrument_key = $1 
       AND timestamp >= $2 AND timestamp <= $3 
       ORDER BY timestamp DESC, side, level 
       LIMIT $4`,
      [instrumentKey, startTime.toISOString(), endTime.toISOString(), limit],
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: any): OrderbookL2Snapshot {
    return {
      timestamp: new Date(row.timestamp),
      instrumentKey: row.instrument_key,
      side: row.side,
      level: parseInt(row.level),
      price: parseFloat(row.price),
      quantity: parseFloat(row.quantity),
      orders: row.orders ? parseInt(row.orders) : undefined,
    };
  }
}
