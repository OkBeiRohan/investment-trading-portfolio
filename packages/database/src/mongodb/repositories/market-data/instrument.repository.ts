/**
 * Instrument Repository (MongoDB)
 * CRUD operations for instrument metadata
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Instrument,
  InstrumentDocument,
} from "../../schemas/market-data/instrument.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class InstrumentRepository {
  constructor(
    @InjectModel(Instrument.name, DatabaseConnections.MarketData)
    private readonly model: Model<InstrumentDocument>,
  ) {}

  async findByKey(instrumentKey: string): Promise<InstrumentDocument | null> {
    return this.model.findOne({ instrumentKey }).exec();
  }

  async findByType(
    instrumentType: "INDEX" | "EQUITY" | "FUTURE" | "OPTION",
  ): Promise<InstrumentDocument[]> {
    return this.model.find({ instrumentType, isActive: true }).exec();
  }

  async findNifty50(): Promise<InstrumentDocument[]> {
    return this.model.find({ isNifty50: true, isActive: true }).exec();
  }

  async findPendingFetch(): Promise<InstrumentDocument[]> {
    return this.model
      .find({ "fetchStatus.status": { $in: ["PENDING", "ERROR"] } })
      .exec();
  }

  async upsert(instrument: Partial<Instrument>): Promise<InstrumentDocument> {
    return this.model
      .findOneAndUpdate(
        { instrumentKey: instrument.instrumentKey },
        { $set: instrument },
        { upsert: true, new: true },
      )
      .exec();
  }

  async upsertMany(instruments: Partial<Instrument>[]): Promise<number> {
    const ops = instruments.map((i) => ({
      updateOne: {
        filter: { instrumentKey: i.instrumentKey },
        update: { $set: i },
        upsert: true,
      },
    }));
    const result = await this.model.bulkWrite(ops);
    return result.upsertedCount + result.modifiedCount;
  }

  async updateFetchStatus(
    instrumentKey: string,
    status: "PENDING" | "FETCHING" | "COMPLETE" | "ERROR" | "PARTIAL",
    errorMessage?: string,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      "fetchStatus.status": status,
      "fetchStatus.lastFetchedAt": new Date(),
    };

    if (status === "COMPLETE") {
      update["fetchStatus.lastSuccessAt"] = new Date();
      update.$inc = { "fetchStatus.successfulFetches": 1 };
    } else if (status === "ERROR") {
      update["fetchStatus.lastErrorAt"] = new Date();
      update["fetchStatus.lastErrorMessage"] = errorMessage;
      update.$inc = { "fetchStatus.failedFetches": 1 };
    }

    await this.model.updateOne({ instrumentKey }, { $set: update }).exec();
  }

  async updateDataAvailability(
    instrumentKey: string,
    dailyStart?: Date,
    dailyEnd?: Date,
    dailyCount?: number,
    minuteStart?: Date,
    minuteEnd?: Date,
    minuteCount?: number,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      "dataAvailability.discoveredAt": new Date(),
    };

    if (dailyStart) update["dataAvailability.dailyStartDate"] = dailyStart;
    if (dailyEnd) update["dataAvailability.dailyEndDate"] = dailyEnd;
    if (dailyCount) update["dataAvailability.dailyCandleCount"] = dailyCount;
    if (minuteStart) update["dataAvailability.minuteStartDate"] = minuteStart;
    if (minuteEnd) update["dataAvailability.minuteEndDate"] = minuteEnd;
    if (minuteCount) update["dataAvailability.minuteCandleCount"] = minuteCount;

    await this.model.updateOne({ instrumentKey }, { $set: update }).exec();
  }

  async findTradingEnabled(): Promise<InstrumentDocument[]> {
    return this.model
      .find({ tradingEnabled: true, isActive: true })
      .exec();
  }

  async findDataCollectionEnabled(): Promise<InstrumentDocument[]> {
    return this.model
      .find({ dataCollectionEnabled: true, isActive: true })
      .exec();
  }

  async updateTradingStatus(
    instrumentKey: string,
    enabled: boolean,
  ): Promise<void> {
    await this.model
      .updateOne({ instrumentKey }, { $set: { tradingEnabled: enabled } })
      .exec();
  }

  async updateDataCollectionStatus(
    instrumentKey: string,
    enabled: boolean,
  ): Promise<void> {
    await this.model
      .updateOne(
        { instrumentKey },
        { $set: { dataCollectionEnabled: enabled } },
      )
      .exec();
  }

  async bulkUpdateTradingStatus(
    instrumentKeys: string[],
    enabled: boolean,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        { instrumentKey: { $in: instrumentKeys } },
        { $set: { tradingEnabled: enabled } },
      )
      .exec();
    return result.modifiedCount;
  }

  async bulkUpdateDataCollectionStatus(
    instrumentKeys: string[],
    enabled: boolean,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        { instrumentKey: { $in: instrumentKeys } },
        { $set: { dataCollectionEnabled: enabled } },
      )
      .exec();
    return result.modifiedCount;
  }

  async findFiltered(options: {
    exchange?: string;
    segment?: string;
    instrumentType?: string;
    tradingEnabled?: boolean;
    dataCollectionEnabled?: boolean;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: InstrumentDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (options.exchange) filter.exchange = options.exchange;
    if (options.segment) filter.segment = options.segment;
    if (options.instrumentType) filter.instrumentType = options.instrumentType;
    if (options.tradingEnabled !== undefined)
      filter.tradingEnabled = options.tradingEnabled;
    if (options.dataCollectionEnabled !== undefined)
      filter.dataCollectionEnabled = options.dataCollectionEnabled;
    if (options.isActive !== undefined) filter.isActive = options.isActive;
    if (options.search) {
      filter.$or = [
        { tradingSymbol: { $regex: options.search, $options: "i" } },
        { name: { $regex: options.search, $options: "i" } },
        { instrumentKey: { $regex: options.search, $options: "i" } },
      ];
    }

    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.find(filter).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { items: items as InstrumentDocument[], total };
  }

  async markStaleInactive(activeSyncDate: Date): Promise<number> {
    const result = await this.model
      .updateMany(
        {
          isActive: true,
          $or: [
            { lastBodSyncAt: { $lt: activeSyncDate } },
            { lastBodSyncAt: { $exists: false } },
          ],
        },
        { $set: { isActive: false } },
      )
      .exec();
    return result.modifiedCount;
  }

  async getSummary(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const [total, byType, byStatus] = await Promise.all([
      this.model.countDocuments(),
      this.model.aggregate([
        { $group: { _id: "$instrumentType", count: { $sum: 1 } } },
      ]),
      this.model.aggregate([
        { $group: { _id: "$fetchStatus.status", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((r) => [r._id, r.count])),
      byStatus: Object.fromEntries(
        byStatus.map((r) => [r._id || "UNKNOWN", r.count]),
      ),
    };
  }
}
