import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Passkey } from "../../schemas/authentication";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class PasskeyRepository {
  constructor(
    @InjectModel(Passkey.name, DatabaseConnections.User)
    private readonly passkeyModel: Model<Passkey>
  ) {}

  async create(data: Partial<Passkey>): Promise<Passkey> {
    const passkey = new this.passkeyModel(data);
    return passkey.save();
  }

  async findById(id: string): Promise<Passkey | null> {
    return this.passkeyModel.findById(id).exec();
  }

  async findByCredentialId(credentialID: string): Promise<Passkey | null> {
    return this.passkeyModel.findOne({ credentialID }).exec();
  }

  async findOne(filter: any): Promise<Passkey | null> {
    return this.passkeyModel.findOne(filter).exec();
  }

  async findByUserId(userId: string): Promise<Passkey[]> {
    return this.passkeyModel.find({ userId }).exec();
  }

  async findMany(
    filter: any,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<Passkey[]> {
    const query = this.passkeyModel.find(filter);

    if (options?.limit) query.limit(options.limit);
    if (options?.skip) query.skip(options.skip);
    if (options?.sort) query.sort(options.sort);

    return query.exec();
  }

  async update(id: string, data: Partial<Passkey>): Promise<Passkey | null> {
    return this.passkeyModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async updateMany(filter: any, data: Partial<Passkey>): Promise<number> {
    const result = await this.passkeyModel.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.passkeyModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: any): Promise<number> {
    const result = await this.passkeyModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.passkeyModel.deleteMany({ userId }).exec();
    return result.deletedCount;
  }

  async count(filter: any): Promise<number> {
    return this.passkeyModel.countDocuments(filter).exec();
  }
}
