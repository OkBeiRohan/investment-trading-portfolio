import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IUser, UserRole, userRoleEnum } from "@repo/schema";
import { Document } from "mongoose";

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User extends Document implements IUser {
  id: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true })
  email: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  phoneNumber?: string | null;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ required: false })
  image?: string | null;

  @Prop({ required: false })
  dateOfBirth?: Date | null;

  @Prop({ required: false })
  country?: string | null;

  @Prop({ required: true, default: "UTC" })
  timezone: string;

  @Prop({ required: true, default: "INR" })
  currency: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isBlocked: boolean;

  @Prop({ required: true, default: ["Investor"], enum: userRoleEnum.options })
  role: UserRole[];

  @Prop({ required: true, default: false })
  twoFactorEnabled: boolean;

  @Prop({ required: false })
  lastLoginAt?: Date | null;

  @Prop({ required: false })
  passwordChangedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ createdAt: -1 });
