import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user/user.schema";
import { Model } from "mongoose";
import { AuthProvider } from "../schemas/authentication";

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ id, deletedAt: null }).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), deletedAt: null })
      .exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    // Check for deleted user with same email
    const email = userData.email?.toLowerCase();
    if (email) {
      const deletedUser = await this.userModel
        .findOne({ email, deletedAt: { $ne: null } })
        .exec();
      if (deletedUser) {
        // Revive user: clear deletedAt, update fields
        Object.assign(deletedUser, userData, { deletedAt: null });
        await deletedUser.save();
        return deletedUser;
      }
    }
    // No deleted user, create new
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate({ id, deletedAt: null }, updateData, {
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
        deletedAt: null,
      })
      .exec();
  }

  async linkAccount(
    userId: string,
    account: AuthProvider
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate(
        { id: userId, deletedAt: null },
        { $push: { accounts: account } },
        { new: true }
      )
      .exec();
  }
}
