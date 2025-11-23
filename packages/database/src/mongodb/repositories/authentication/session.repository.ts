import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Session } from "../../schemas/authentication";
import { Model } from "mongoose";

@Injectable()
export class SessionRepository {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>
  ) {}

  async create(sessionData: Partial<Session>): Promise<Session> {
    const newSession = new this.sessionModel(sessionData);
    return newSession.save();
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.sessionModel
      .findOne({ token, expiresAt: { $gt: new Date() } })
      .populate("userId")
      .exec();
  }

  async deleteByToken(token: string): Promise<void> {
    await this.sessionModel
      .deleteOne({
        token,
      })
      .exec();
  }

  async deleteExpired(): Promise<void> {
    await this.sessionModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.sessionModel
      .find({ userId, expiresAt: { $gt: new Date() } })
      .populate("userId")
      .exec();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.sessionModel.deleteMany({ userId }).exec();
  }
}
