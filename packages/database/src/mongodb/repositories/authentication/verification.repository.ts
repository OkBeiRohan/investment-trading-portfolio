import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
import { Verification } from "../../schemas/authentication";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class VerificationRepository {
  constructor(
    @InjectModel(Verification.name, DatabaseConnections.User)
    private readonly verificationModel: Model<Verification>
  ) {}

  async create(data: Partial<Verification>): Promise<Verification> {
    const verification = new this.verificationModel(data);
    return verification.save();
  }

  async findOne(
    filter: QueryFilter<Verification>
  ): Promise<Verification | null> {
    return this.verificationModel.findOne(filter).exec();
  }

  async findMany(
    filter: QueryFilter<Verification>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<Verification[]> {
    const query = this.verificationModel.find(filter);

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(
    id: string,
    data: Partial<Verification>
  ): Promise<Verification | null> {
    return this.verificationModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .exec();
  }

  async updateMany(
    filter: QueryFilter<Verification>,
    data: Partial<Verification>
  ): Promise<number> {
    const result = await this.verificationModel.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.verificationModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: QueryFilter<Verification>): Promise<number> {
    const result = await this.verificationModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: QueryFilter<Verification>): Promise<number> {
    return this.verificationModel.countDocuments(filter).exec();
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.verificationModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
    return result.deletedCount;
  }
}
