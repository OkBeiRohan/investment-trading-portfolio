import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SystemConfig } from "../../schemas/trading/system-config.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class SystemConfigRepository {
  constructor(
    @InjectModel(SystemConfig.name, DatabaseConnections.Trading)
    private readonly model: Model<SystemConfig>,
  ) {}

  async create(data: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = new this.model(data);
    return config.save();
  }

  async findById(id: string): Promise<SystemConfig | null> {
    return this.model.findById(id).exec();
  }

  async getByKey(key: string): Promise<SystemConfig | null> {
    return this.model.findOne({ key }).exec();
  }

  async getByCategory(category: string): Promise<SystemConfig[]> {
    return this.model.find({ category }).exec();
  }

  async upsertConfig(
    key: string,
    data: Partial<SystemConfig>,
  ): Promise<SystemConfig> {
    return this.model
      .findOneAndUpdate(
        { key },
        { $set: data },
        { upsert: true, new: true },
      )
      .exec();
  }

  async update(
    id: string,
    data: Partial<SystemConfig>,
  ): Promise<SystemConfig | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
