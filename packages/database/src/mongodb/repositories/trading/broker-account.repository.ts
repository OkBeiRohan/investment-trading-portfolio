import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
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
    filter: QueryFilter<BrokerAccount>
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
      .findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { returnDocument: 'after' })
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
        { upsert: true, returnDocument: 'after' }
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

  async count(filter: QueryFilter<BrokerAccount>): Promise<number> {
    return this.brokerAccountModel.countDocuments(filter).exec();
  }

  /**
   * Find broker account with access token included (normally excluded via select: false).
   * Used by AuthManagerService for token retrieval.
   */
  async findWithAccessToken(
    userId: string,
    providerId: string
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOne({ userId, providerId })
      .select("+accessToken +accessTokenExpiresAt")
      .exec();
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
        { returnDocument: 'after' }
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

  /**
   * Get all broker accounts that are enabled for market-feeder data collection.
   * Used by market-feeder to build the token pool at startup.
   */
  async findDataCollectionEnabledAccounts(): Promise<BrokerAccount[]> {
    return this.brokerAccountModel
      .find({
        isDataCollectionEnabled: true,
        accessToken: { $exists: true, $ne: null },
      })
      .select("+accessToken") // accessToken is excluded by default
      .exec();
  }

  /**
   * Update trading settings for a broker account.
   * Can be called by users (hasTradingEnabled, tradingSegments) or
   * admin (isDataCollectionEnabled).
   */
  async updateTradingSettings(
    userId: string,
    data: Partial<Pick<BrokerAccount, "hasTradingEnabled" | "tradingSegments" | "isDataCollectionEnabled">>
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOneAndUpdate(
        { userId, providerId: "upstox" },
        { ...data, updatedAt: new Date() },
        { returnDocument: 'after' }
      )
      .exec();
  }

  /**
   * Record timestamp of successful Phase 2 Upstox re-authentication.
   */
  async updateLastReAuth(userId: string): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOneAndUpdate(
        { userId, providerId: "upstox" },
        { lastReAuthAt: new Date(), updatedAt: new Date() },
        { returnDocument: 'after' }
      )
      .exec();
  }

  /**
   * Find any broker account with a valid (non-expired) access token.
   * Used by system-level services (market-feeder) when no specific user is targeted.
   */
  async findAnyValidToken(
    providerId: string,
  ): Promise<BrokerAccount | null> {
    return this.brokerAccountModel
      .findOne({
        providerId,
        accessToken: { $exists: true, $ne: null },
        $or: [
          { accessTokenExpiresAt: { $gt: new Date() } },
          { accessTokenExpiresAt: { $exists: false } },
        ],
      })
      .select("+accessToken +accessTokenExpiresAt")
      .sort({ lastReAuthAt: -1 })
      .exec();
  }
}
