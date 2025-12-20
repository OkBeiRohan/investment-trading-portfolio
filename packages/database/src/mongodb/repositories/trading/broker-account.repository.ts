import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, FilterQuery } from "mongoose";
import { BrokerAccount } from "../../schemas/trading";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class BrokerAccountRepository {
  constructor(
    @InjectModel(BrokerAccount.name, DatabaseConnections.Trading)
    private readonly brokerAccountModel: Model<BrokerAccount>
  ) {}

  async create(data: Partial<BrokerAccount>): Promise<BrokerAccount> {
    const account = new this.brokerAccountModel(data);
    return account.save();
  }

  async findById(id: string): Promise<BrokerAccount | null> {
    return this.brokerAccountModel.findById(id).exec();
  }

  async findOne(
    filter: FilterQuery<BrokerAccount>
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel.findOne(filter).exec();
  }

  async findByUserId(userId: string): Promise<BrokerAccount[]> {
    return this.brokerAccountModel.find({ userId }).exec();
  }

  async findByUserIdAndProvider(
    userId: string,
    providerId: string
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel.findOne({ userId, providerId }).exec();
  }

  async update(
    id: string,
    data: Partial<BrokerAccount>
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true })
      .exec();
  }

  async updateByUserIdAndProvider(
    userId: string,
    providerId: string,
    data: Partial<BrokerAccount>
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOneAndUpdate(
        { userId, providerId },
        { ...data, updatedAt: new Date() },
        { new: true, upsert: true }
      )
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.brokerAccountModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.brokerAccountModel.deleteMany({ userId }).exec();
    return result.deletedCount;
  }

  async count(filter: FilterQuery<BrokerAccount>): Promise<number> {
    return this.brokerAccountModel.countDocuments(filter).exec();
  }

  /**
   * Find broker account by Upstox user_id (stored in profile.userId)
   */
  async findByUpstoxUserId(
    upstoxUserId: string
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOne({ "profile.userId": upstoxUserId })
      .exec();
  }

  /**
   * Update access token and expiry for a broker account
   */
  async updateAccessToken(
    userId: string,
    accessToken: string,
    expiresAt: Date
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOneAndUpdate(
        { userId, providerId: "upstox" },
        {
          accessToken,
          accessTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
          lastSyncAt: new Date(),
        },
        { new: true }
      )
      .exec();
  }

  /**
   * Get all broker accounts with expiring tokens (within next 24 hours)
   */
  async findExpiringTokens(): Promise<BrokerAccount[]> {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    return this.brokerAccountModel
      .find({
        accessTokenExpiresAt: { $lte: tomorrow },
        providerId: "upstox",
      })
      .exec();
  }
}
