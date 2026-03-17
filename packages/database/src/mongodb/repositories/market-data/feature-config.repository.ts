import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FeatureConfig } from "../../schemas/market-data/feature-config.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class FeatureConfigRepository {
  constructor(
    @InjectModel(FeatureConfig.name, DatabaseConnections.MarketData)
    private readonly model: Model<FeatureConfig>,
  ) {}

  async create(data: Partial<FeatureConfig>): Promise<FeatureConfig> {
    const config = new this.model(data);
    return config.save();
  }

  async findById(id: string): Promise<FeatureConfig | null> {
    return this.model.findById(id).exec();
  }

  async findAll(): Promise<FeatureConfig[]> {
    return this.model.find().exec();
  }

  async findEnabled(): Promise<FeatureConfig[]> {
    return this.model.find({ enabled: true }).exec();
  }

  async findByTier(tier: number): Promise<FeatureConfig[]> {
    return this.model.find({ tier }).exec();
  }

  async findByCategory(category: string): Promise<FeatureConfig[]> {
    return this.model.find({ category }).exec();
  }

  async update(
    id: string,
    data: Partial<FeatureConfig>,
  ): Promise<FeatureConfig | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
