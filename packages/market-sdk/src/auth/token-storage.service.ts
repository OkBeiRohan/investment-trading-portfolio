import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UpstoxToken, UpstoxTokenDocument } from "@repo/database";
import { UpstoxEnv } from "@repo/schema";

export interface TokenRecord {
  userId: string;
  upstoxUserId: string;
  encryptedAccessToken: string;
  iv: string;
  authTag: string;
  environment: UpstoxEnv;
  expiry: Date;
}

@Injectable()
export class TokenStorageService {
  private readonly logger = new Logger(TokenStorageService.name);

  constructor(
    @InjectModel(UpstoxToken.name)
    private tokenModel: Model<UpstoxTokenDocument>
  ) {}

  async saveToken(record: TokenRecord): Promise<void> {
    await this.tokenModel.findOneAndUpdate(
      { userId: record.userId, environment: record.environment },
      record,
      { upsert: true, new: true }
    );
    this.logger.log(
      `Token saved for user ${record.userId} (${record.environment})`
    );
  }

  async getToken(
    userId: string,
    environment: UpstoxEnv
  ): Promise<TokenRecord | null> {
    const doc = await this.tokenModel.findOne({ userId, environment }).lean();
    return doc as TokenRecord | null;
  }

  async deleteToken(userId: string, environment: UpstoxEnv): Promise<void> {
    await this.tokenModel.deleteOne({ userId, environment });
    this.logger.log(`Token deleted for user ${userId} (${environment})`);
  }

  async getAllTokensForUser(userId: string): Promise<TokenRecord[]> {
    const docs = await this.tokenModel.find({ userId }).lean();
    return docs as TokenRecord[];
  }

  async isTokenExpired(
    userId: string,
    environment: UpstoxEnv
  ): Promise<boolean> {
    const token = await this.getToken(userId, environment);
    if (!token) return true;
    return new Date() > token.expiry;
  }
}
