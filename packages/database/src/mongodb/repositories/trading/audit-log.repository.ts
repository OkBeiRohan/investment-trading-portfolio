import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog } from "../../schemas/trading/audit-log.schema";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name, DatabaseConnections.Logging)
    private readonly model: Model<AuditLog>,
  ) {}

  async create(data: Partial<AuditLog>): Promise<AuditLog> {
    const log = new this.model(data);
    return log.save();
  }

  async findByUser(
    userId: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<AuditLog[]> {
    return this.model
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  async findByAction(
    action: string,
    options: { skip?: number; limit?: number } = {},
  ): Promise<AuditLog[]> {
    return this.model
      .find({ action })
      .sort({ timestamp: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  async findRecent(
    options: { skip?: number; limit?: number } = {},
  ): Promise<AuditLog[]> {
    return this.model
      .find()
      .sort({ timestamp: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  async countByUser(userId: string): Promise<number> {
    return this.model.countDocuments({ userId }).exec();
  }

  async countByAction(action: string): Promise<number> {
    return this.model.countDocuments({ action }).exec();
  }
}
