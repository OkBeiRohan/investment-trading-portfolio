import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IUser, USER_ROLES, UserRole } from "@repo/schema";
import { Document } from "mongoose";

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User
  extends Document
  implements Omit<IUser, "id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  phoneNumber?: string;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ required: false })
  image?: string;

  @Prop({ required: false })
  dateOfBirth?: Date;

  @Prop({ required: false })
  country?: string;

  @Prop({ required: true, default: "UTC" })
  timezone: string;

  @Prop({ required: true, default: "INR" })
  currency: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isBlocked: boolean;

  @Prop({
    required: true,
    type: [String],
    default: [USER_ROLES[0]],
    enum: USER_ROLES,
  })
  role: UserRole[];

  @Prop({ required: true, default: false })
  twoFactorEnabled: boolean;

  @Prop({ required: false })
  lastLoginAt?: Date;

  @Prop({ required: false })
  passwordChangedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ createdAt: -1 });
