import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, FilterQuery } from "mongoose";
import { Account } from "../../schemas/authentication";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class AccountRepository {
  constructor(
    @InjectModel(Account.name, DatabaseConnections.User)
    private readonly accountModel: Model<Account>
  ) {}

  async create(data: Partial<Account>): Promise<Account> {
    const account = new this.accountModel(data);
    return account.save();
  }

  async findById(id: string): Promise<Account | null> {
    return this.accountModel.findById(id).exec();
  }

  async findOne(filter: FilterQuery<Account>): Promise<Account | null> {
    return this.accountModel.findOne(filter).exec();
  }

  async findMany(
    filter: FilterQuery<Account>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<Account[]> {
    const query = this.accountModel.find(filter);

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(id: string, data: Partial<Account>): Promise<Account | null> {
    return this.accountModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async updateMany(
    filter: FilterQuery<Account>,
    data: Partial<Account>
  ): Promise<number> {
    const result = await this.accountModel.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.accountModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: FilterQuery<Account>): Promise<number> {
    const result = await this.accountModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: FilterQuery<Account>): Promise<number> {
    return this.accountModel.countDocuments(filter).exec();
  }
}
