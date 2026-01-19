/**
 * Processing Log Repository (MongoDB)
 * Store and query pipeline logs/errors
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ProcessingLog,
  ProcessingLogDocument,
} from "../../schemas/market-data/processing-log.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class ProcessingLogRepository {
  constructor(
    @InjectModel(ProcessingLog.name, DatabaseConnections.Logging)
    private readonly model: Model<ProcessingLogDocument>,
  ) {}

  async log(
    log: Omit<ProcessingLog, "timestamp">,
  ): Promise<ProcessingLogDocument> {
    return this.model.create({
      ...log,
      timestamp: new Date(),
    });
  }

  async logError(
    category: ProcessingLog["category"],
    operation: string,
    message: string,
    context?: {
      instrumentKey?: string;
      errorCode?: string;
      stackTrace?: string;
      durationMs?: number;
      service?: string;
    },
  ): Promise<ProcessingLogDocument> {
    return this.model.create({
      timestamp: new Date(),
      category,
      level: "ERROR",
      operation,
      message,
      instrumentKey: context?.instrumentKey,
      errorCode: context?.errorCode,
      stackTrace: context?.stackTrace,
      durationMs: context?.durationMs,
      service: context?.service || "unknown",
    });
  }

  async logInfo(
    category: ProcessingLog["category"],
    operation: string,
    message: string,
    context?: {
      instrumentKey?: string;
      recordsProcessed?: number;
      durationMs?: number;
      service?: string;
    },
  ): Promise<ProcessingLogDocument> {
    return this.model.create({
      timestamp: new Date(),
      category,
      level: "INFO",
      operation,
      message,
      instrumentKey: context?.instrumentKey,
      recordsProcessed: context?.recordsProcessed,
      durationMs: context?.durationMs,
      service: context?.service || "unknown",
    });
  }

  async findByCategory(
    category: ProcessingLog["category"],
    limit = 100,
  ): Promise<ProcessingLogDocument[]> {
    return this.model
      .find({ category })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findErrors(limit = 100): Promise<ProcessingLogDocument[]> {
    return this.model
      .find({ level: { $in: ["ERROR", "FATAL"] } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByInstrument(
    instrumentKey: string,
    limit = 100,
  ): Promise<ProcessingLogDocument[]> {
    return this.model
      .find({ instrumentKey })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getErrorSummary(hours = 24): Promise<{
    totalErrors: number;
    byCategory: Record<string, number>;
    byErrorCode: Record<string, number>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalErrors, byCategory, byErrorCode] = await Promise.all([
      this.model.countDocuments({
        level: { $in: ["ERROR", "FATAL"] },
        timestamp: { $gte: since },
      }),
      this.model.aggregate([
        {
          $match: {
            level: { $in: ["ERROR", "FATAL"] },
            timestamp: { $gte: since },
          },
        },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      this.model.aggregate([
        {
          $match: {
            level: { $in: ["ERROR", "FATAL"] },
            timestamp: { $gte: since },
            errorCode: { $exists: true },
          },
        },
        { $group: { _id: "$errorCode", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalErrors,
      byCategory: Object.fromEntries(byCategory.map((r) => [r._id, r.count])),
      byErrorCode: Object.fromEntries(byErrorCode.map((r) => [r._id, r.count])),
    };
  }
}
