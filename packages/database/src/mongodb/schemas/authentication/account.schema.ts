import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { IAccount } from "@repo/schema";
import { User } from "../user/user.schema";

@Schema({ timestamps: true })
export class Account extends Document implements IAccount {
  id: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  userId: string;

  @Prop({ required: true })
  accountId: string;

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: false })
  accessToken?: string;

  @Prop({ required: false })
  refreshToken?: string;

  @Prop({ required: false })
  accessTokenExpiresAt?: Date;

  @Prop({ required: false })
  refreshTokenExpiresAt?: Date;

  @Prop({ required: false })
  scope?: string;

  @Prop({ required: false })
  idTaken?: string;

  @Prop({ required: false })
  password?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });
AccountSchema.index({ userId: 1 });
