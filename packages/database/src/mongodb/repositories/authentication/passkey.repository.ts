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

  async findByUserId(userId: string): Promise<Passkey[]> {
    return this.passkeyModel.find({ userId }).exec();
  }

  async update(id: string, data: Partial<Passkey>): Promise<Passkey | null> {
    return this.passkeyModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.passkeyModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.passkeyModel.deleteMany({ userId }).exec();
    return result.deletedCount;
  }
}
