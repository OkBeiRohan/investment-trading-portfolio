import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IUser, UserRole, userRoleEnum } from "@repo/schema";
import { Document } from "mongoose";
import * as crypto from "crypto";
import {
  AuthProvider,
  AuthProviderSchema,
} from "../authentication/auth-provider.schema";

@Schema({ timestamps: true })
export class User extends Document implements IUser {
  @Prop({ required: true, unique: true, default: () => crypto.randomUUID() })
  id: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true })
  email: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: false })
  phoneNumber?: string | null;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop({ required: false })
  avatarUrl?: string | null;

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
  roles: UserRole[];

  @Prop({ required: true, default: false })
  twoFactorEnabled: boolean;

  @Prop({ required: false })
  twoFactorSecret?: string | null;

  @Prop({ required: false })
  lastLoginAt?: Date | null;

  @Prop({ required: false })
  passwordChangedAt?: Date | null;

  @Prop({ required: true, default: [], type: [AuthProviderSchema] })
  accounts: AuthProvider[];

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
