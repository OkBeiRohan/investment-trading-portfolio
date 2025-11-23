import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TwoFactor } from "../../schemas/authentication";

@Injectable()
export class TwoFactorRepository {
  constructor(
    @InjectModel(TwoFactor.name)
    private readonly twoFactorModel: Model<TwoFactor>
  ) {}

  async create(data: Partial<TwoFactor>): Promise<TwoFactor> {
    const twoFactor = new this.twoFactorModel(data);
    return twoFactor.save();
  }

  async findByUserId(userId: string): Promise<TwoFactor | null> {
    return this.twoFactorModel.findOne({ userId }).exec();
  }

  async update(
    userId: string,
    data: Partial<TwoFactor>
  ): Promise<TwoFactor | null> {
    return this.twoFactorModel
      .findOneAndUpdate({ userId }, data, { new: true })
      .exec();
  }

  async delete(userId: string): Promise<boolean> {
    const result = await this.twoFactorModel
      .findOneAndDelete({ userId })
      .exec();
    return !!result;
  }
}
