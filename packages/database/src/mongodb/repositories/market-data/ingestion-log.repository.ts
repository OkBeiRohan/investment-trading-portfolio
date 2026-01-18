import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { IngestionLog } from "../../schemas/market-data/ingestion-log.schema";
import DatabaseConnections from "../../connections/connections";

/**
 * Ingestion Log Repository
 * Tracks all data fetch operations for debugging and retry
 */
@Injectable()
export class IngestionLogRepository {
  constructor(
    @InjectModel(IngestionLog.name, DatabaseConnections.MarketData)
    private readonly model: Model<IngestionLog>,
  ) {}

  /**
   * Create a new ingestion log entry
   */
  async create(data: Partial<IngestionLog>): Promise<IngestionLog> {
    return this.model.create({
      ...data,
      startedAt: new Date(),
      status: "PENDING",
    });
  }

  /**
   * Update status to IN_PROGRESS
   */
  async markInProgress(id: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { $set: { status: "IN_PROGRESS", startedAt: new Date() } },
    );
  }

  /**
   * Mark as SUCCESS with result
   */
  async markSuccess(
    id: string,
    result: {
      candlesFetched: number;
      candlesStored: number;
      duplicatesSkipped: number;
      firstCandleTime?: Date;
      lastCandleTime?: Date;
    },
  ): Promise<void> {
    const now = new Date();
    const doc = await this.model.findById(id);
    const durationMs = doc?.startedAt
      ? now.getTime() - doc.startedAt.getTime()
      : 0;

    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          status: "SUCCESS",
          result,
          completedAt: now,
          durationMs,
        },
      },
    );
  }

  /**
   * Mark as FAILED with error
   */
  async markFailed(
    id: string,
    error: {
      code: string;
      message: string;
      httpStatus?: number;
    },
  ): Promise<void> {
    const now = new Date();
    const doc = await this.model.findById(id);
    const durationMs = doc?.startedAt
      ? now.getTime() - doc.startedAt.getTime()
      : 0;

    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          status: "FAILED",
          "error.code": error.code,
          "error.message": error.message,
          "error.httpStatus": error.httpStatus,
          "error.lastRetryAt": now,
          completedAt: now,
          durationMs,
        },
        $inc: { "error.retryCount": 1 },
      },
    );
  }

  /**
   * Get failed operations for retry
   */
  async findFailedForRetry(maxRetries: number = 3): Promise<IngestionLog[]> {
    return this.model.find({
      status: "FAILED",
      "error.retryCount": { $lt: maxRetries },
    });
  }

  /**
   * Get recent logs for an instrument
   */
  async findRecentByInstrument(
    instrumentKey: string,
    limit: number = 10,
  ): Promise<IngestionLog[]> {
    return this.model
      .find({ instrumentKey })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Get aggregated stats
   */
  async getStats(since: Date): Promise<{
    total: number;
    success: number;
    failed: number;
    partial: number;
    avgDurationMs: number;
    totalCandlesFetched: number;
  }> {
    const result = await this.model.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
          partial: { $sum: { $cond: [{ $eq: ["$status", "PARTIAL"] }, 1, 0] } },
          avgDurationMs: { $avg: "$durationMs" },
          totalCandlesFetched: { $sum: "$result.candlesFetched" },
        },
      },
    ]);

    return (
      result[0] || {
        total: 0,
        success: 0,
        failed: 0,
        partial: 0,
        avgDurationMs: 0,
        totalCandlesFetched: 0,
      }
    );
  }

  /**
   * Check if operation already exists for time range
   */
  async existsForRange(
    instrumentKey: string,
    operation: string,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const count = await this.model.countDocuments({
      instrumentKey,
      operation,
      "requestedRange.start": start,
      "requestedRange.end": end,
      status: "SUCCESS",
    });
    return count > 0;
  }
}
