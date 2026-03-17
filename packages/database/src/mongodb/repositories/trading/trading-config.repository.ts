import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TradingConfig } from "../../schemas/trading/trading-config.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class TradingConfigRepository {
  constructor(
    @InjectModel(TradingConfig.name, DatabaseConnections.Trading)
    private readonly model: Model<TradingConfig>,
  ) {}

  async create(data: Partial<TradingConfig>): Promise<TradingConfig> {
    const config = new this.model(data);
    return config.save();
  }

  async findById(id: string): Promise<TradingConfig | null> {
    return this.model.findById(id).exec();
  }

  async findByUserId(userId: string): Promise<TradingConfig | null> {
    return this.model.findOne({ userId }).exec();
  }

  async findByOrganization(
    organizationId: string,
  ): Promise<TradingConfig[]> {
    return this.model.find({ organizationId }).exec();
  }

  async update(
    id: string,
    data: Partial<TradingConfig>,
  ): Promise<TradingConfig | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async updateByUserId(
    userId: string,
    data: Partial<TradingConfig>,
  ): Promise<TradingConfig | null> {
    return this.model
      .findOneAndUpdate({ userId }, data, { new: true })
      .exec();
  }

  async updateRiskLimits(
    userId: string,
    riskLimits: Partial<TradingConfig["riskLimits"]>,
  ): Promise<TradingConfig | null> {
    const update: Record<string, any> = {};
    for (const [key, value] of Object.entries(riskLimits)) {
      update[`riskLimits.${key}`] = value;
    }
    return this.model
      .findOneAndUpdate({ userId }, { $set: update }, { new: true })
      .exec();
  }

  async enableTrading(userId: string): Promise<TradingConfig | null> {
    return this.model
      .findOneAndUpdate({ userId }, { enabled: true }, { new: true })
      .exec();
  }

  async disableTrading(userId: string): Promise<TradingConfig | null> {
    return this.model
      .findOneAndUpdate({ userId }, { enabled: false }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
