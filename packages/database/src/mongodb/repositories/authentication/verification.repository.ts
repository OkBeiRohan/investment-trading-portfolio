import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
import { Verification } from "../../schemas/authentication";
import DatabaseConnections from "../../connections/connections";

@Injectable()
export class VerificationRepository {
  constructor(
    @InjectModel(Verification.name, DatabaseConnections.User)
    private readonly verificationModel: Model<Verification>
  ) {}

  async create(data: Partial<Verification>): Promise<Verification> {
    const verification = new this.verificationModel(data);
    return verification.save();
  }

  async findOne(
    filter: QueryFilter<Verification>
  ): Promise<Verification | null> {
    return this.verificationModel.findOne(filter).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.verificationModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMany(filter: QueryFilter<Verification>): Promise<number> {
    const result = await this.verificationModel.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.verificationModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
      })
      .exec();
    return result.deletedCount;
  }
}
