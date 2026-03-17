import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SystemConfig } from "../../schemas/trading/system-config.schema";
import type { SystemConfigCategory, SystemConfigValueType } from "@repo/schema";
import DatabaseConnections from "../../connections/connections";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

export interface SeedConfigItem {
  key: string;
  value: unknown;
  category: SystemConfigCategory;
  description: string;
  valueType: SystemConfigValueType;
  isSecret?: boolean;
}

@Injectable()
export class SystemConfigRepository {
  private readonly logger = new Logger(SystemConfigRepository.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectModel(SystemConfig.name, DatabaseConnections.Trading)
    private readonly model: Model<SystemConfig>,
  ) {}

  async create(data: Partial<SystemConfig>): Promise<SystemConfig> {
    const config = new this.model(data);
    const saved = await config.save();
    this.cache.delete(data.key!);
    return saved;
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

  async getTyped<T>(key: string, defaultValue: T): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const doc = await this.model.findOne({ key }).lean().exec();
    if (!doc) {
      return defaultValue;
    }

    const value = doc.value as T;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
    return value;
  }

  async bulkUpsert(configs: SeedConfigItem[]): Promise<number> {
    const ops = configs.map((c) => ({
      updateOne: {
        filter: { key: c.key },
        update: { $setOnInsert: c },
        upsert: true,
      },
    }));
    const result = await this.model.bulkWrite(ops);
    return result.upsertedCount;
  }

  async upsertConfig(
    key: string,
    data: Partial<SystemConfig>,
  ): Promise<SystemConfig> {
    this.cache.delete(key);
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
    if (data.key) this.cache.delete(data.key);
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const doc = await this.model.findById(id).exec();
    if (doc) this.cache.delete(doc.key);
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
