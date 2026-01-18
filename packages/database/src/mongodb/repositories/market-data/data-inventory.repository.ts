import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DataInventory } from "../../schemas/data-inventory.schema";
import DatabaseConnections from "../../connections/connections";

/**
 * Data Inventory Repository
 * Manages data availability tracking for all instruments
 */
@Injectable()
export class DataInventoryRepository {
  constructor(
    @InjectModel(DataInventory.name, DatabaseConnections.MarketData)
    private readonly model: Model<DataInventory>,
  ) {}

  /**
   * Create or update inventory entry for an instrument
   */
  async upsert(
    instrumentKey: string,
    data: Partial<DataInventory>,
  ): Promise<DataInventory> {
    return this.model.findOneAndUpdate(
      { instrumentKey },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  /**
   * Get inventory for an instrument
   */
  async findByInstrumentKey(
    instrumentKey: string,
  ): Promise<DataInventory | null> {
    return this.model.findOne({ instrumentKey });
  }

  /**
   * Get all instruments with data gaps
   */
  async findWithGaps(): Promise<DataInventory[]> {
    return this.model.find({ "missingRanges.0": { $exists: true } });
  }

  /**
   * Get instruments by type
   */
  async findByType(
    instrumentType: "INDEX" | "STOCK" | "FUTURE" | "OPTION",
  ): Promise<DataInventory[]> {
    return this.model.find({ instrumentType });
  }

  /**
   * Update daily data range
   */
  async updateDailyRange(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
    totalCandles: number,
  ): Promise<void> {
    await this.model.updateOne(
      { instrumentKey },
      {
        $set: {
          "dailyData.startDate": startDate,
          "dailyData.endDate": endDate,
          "dailyData.totalCandles": totalCandles,
          "dailyData.lastUpdated": new Date(),
        },
      },
    );
  }

  /**
   * Update minute data range
   */
  async updateMinuteRange(
    instrumentKey: string,
    startDate: Date,
    endDate: Date,
    totalCandles: number,
  ): Promise<void> {
    await this.model.updateOne(
      { instrumentKey },
      {
        $set: {
          "minuteData.startDate": startDate,
          "minuteData.endDate": endDate,
          "minuteData.totalCandles": totalCandles,
          "minuteData.lastUpdated": new Date(),
        },
      },
    );
  }

  /**
   * Add a missing data range
   */
  async addMissingRange(
    instrumentKey: string,
    start: Date,
    end: Date,
    reason: string,
    intervalUnit: "minutes" | "days",
  ): Promise<void> {
    await this.model.updateOne(
      { instrumentKey },
      {
        $push: {
          missingRanges: { start, end, reason, intervalUnit },
        },
      },
    );
  }

  /**
   * Remove a missing range after it's been filled
   */
  async removeMissingRange(
    instrumentKey: string,
    start: Date,
    end: Date,
  ): Promise<void> {
    await this.model.updateOne(
      { instrumentKey },
      {
        $pull: {
          missingRanges: { start, end },
        },
      },
    );
  }

  /**
   * Get instruments needing data refresh (no update in last N hours)
   */
  async findStaleInventory(hoursThreshold: number): Promise<DataInventory[]> {
    const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    return this.model.find({
      $or: [
        { "dailyData.lastUpdated": { $lt: threshold } },
        { "minuteData.lastUpdated": { $lt: threshold } },
      ],
    });
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{
    totalInstruments: number;
    byType: Record<string, number>;
    withGaps: number;
  }> {
    const [total, byType, withGaps] = await Promise.all([
      this.model.countDocuments(),
      this.model.aggregate([
        { $group: { _id: "$instrumentType", count: { $sum: 1 } } },
      ]),
      this.model.countDocuments({ "missingRanges.0": { $exists: true } }),
    ]);

    return {
      totalInstruments: total,
      byType: Object.fromEntries(byType.map((b) => [b._id, b.count])),
      withGaps,
    };
  }
}
