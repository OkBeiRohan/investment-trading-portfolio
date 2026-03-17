import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Session } from "../../schemas/authentication";
import { Model, QueryFilter } from "mongoose";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(Session.name, DatabaseConnections.User)
    private readonly sessionModel: Model<Session>
  ) {}

  async create(data: Partial<Session>): Promise<Session> {
    const session = new this.sessionModel(data);
    return session.save();
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessionModel.findById(id).populate("userId").exec();
  }

  async findOne(filter: QueryFilter<Session>): Promise<Session | null> {
    return this.sessionModel.findOne(filter).populate("userId").exec();
  }

  async findMany(
    filter: QueryFilter<Session>,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<Session[]> {
    const query = this.sessionModel.find(filter).populate("userId");

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    return this.sessionModel
      .findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate("userId")
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sessionModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: QueryFilter<Session>): Promise<number> {
    const result = await this.sessionModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: QueryFilter<Session>): Promise<number> {
    return this.sessionModel.countDocuments(filter).exec();
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.sessionModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
    return result.deletedCount;
  }
}
