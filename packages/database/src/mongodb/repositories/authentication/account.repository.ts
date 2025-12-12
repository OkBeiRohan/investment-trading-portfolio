import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
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

  async findOne(filter: QueryFilter<Account>): Promise<Account | null> {
    return this.accountModel.findOne(filter).exec();
  }

  async findMany(filter: QueryFilter<Account>): Promise<Account[]> {
    return this.accountModel.find(filter).exec();
  }

  async update(id: string, data: Partial<Account>): Promise<Account | null> {
    return this.accountModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.accountModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: QueryFilter<Account>): Promise<number> {
    const result = await this.accountModel.deleteMany(filter).exec();
    return result.deletedCount;
  }
}
