import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user/user.schema";
import { Model } from "mongoose";
import { AuthProvider } from "../schemas/authentication";

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
      })
      .exec();
  }

  async findByProviderId(
    provider: string,
    accountId: string
  ): Promise<User | null> {
    return this.userModel
      .findOne({
        "accounts.provider": provider,
        "accounts.accountId": accountId,
      })
      .exec();
  }

  async linkAccount(
    userId: string,
    account: AuthProvider
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $push: { accounts: account } },
        { new: true }
      )
      .exec();
  }
}
