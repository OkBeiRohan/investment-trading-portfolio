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
