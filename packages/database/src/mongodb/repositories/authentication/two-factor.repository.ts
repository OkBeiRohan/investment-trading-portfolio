import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TwoFactor } from "../../schemas/authentication";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class TwoFactorRepository {
  constructor(
    @InjectModel(TwoFactor.name, DatabaseConnections.User)
    private readonly twoFactorModel: Model<TwoFactor>
  ) {}

  async create(data: Partial<TwoFactor>): Promise<TwoFactor> {
    const twoFactor = new this.twoFactorModel(data);
    return twoFactor.save();
  }

  async findOne(filter: any): Promise<TwoFactor | null> {
    return this.twoFactorModel.findOne(filter).exec();
  }

  async findByUserId(userId: string): Promise<TwoFactor | null> {
    return this.twoFactorModel.findOne({ userId }).exec();
  }

  async findMany(
    filter: any,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<TwoFactor[]> {
    const query = this.twoFactorModel.find(filter);

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(
    userId: string,
    data: Partial<TwoFactor>
  ): Promise<TwoFactor | null> {
    return this.twoFactorModel
      .findOneAndUpdate({ userId }, data, { returnDocument: 'after' })
      .exec();
  }

  async updateMany(filter: any, data: Partial<TwoFactor>): Promise<number> {
    const result = await this.twoFactorModel.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.twoFactorModel
      .findOneAndDelete({ userId })
      .exec();
    return !!result;
  }

  async deleteMany(filter: any): Promise<number> {
    const result = await this.twoFactorModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: any): Promise<number> {
    return this.twoFactorModel.countDocuments(filter).exec();
  }
}
