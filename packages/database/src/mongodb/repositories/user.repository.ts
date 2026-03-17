import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
import { User } from "../schemas/user/user.schema";
import DatabaseConnections from "../connections/connections";

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name, DatabaseConnections.User)
    private readonly userModel: Model<User>
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findOne(filter: QueryFilter<User>): Promise<User | null> {
    return this.userModel.findOne(filter).exec();
  }

  async findMany(
    filter: QueryFilter<User>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<User[]> {
    const query = this.userModel.find(filter);

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async updateMany(
    filter: QueryFilter<User>,
    data: Partial<User>
  ): Promise<number> {
    const result = await this.userModel.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: QueryFilter<User>): Promise<number> {
    const result = await this.userModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: QueryFilter<User>): Promise<number> {
    return this.userModel.countDocuments(filter).exec();
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userModel.find({ role, isActive: true }).exec();
  }
}
