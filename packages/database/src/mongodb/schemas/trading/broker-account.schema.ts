import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  IBrokerAccount,
  BrokerExchange,
  BrokerProduct,
  BrokerOrderType,
  BrokerSegment,
} from "@repo/schema";
import { User } from "../user/user.schema";
import { Account } from "../authentication/account.schema";
import {
  BrokerAccountProfile,
  BrokerAccountProfileSchema,
} from "./broker-account-profile.schema";
import {
  BrokerAccountFundMargin,
  BrokerAccountFundMarginSchema,
} from "./broker-account-fund-margin.schema";

@Schema({ timestamps: true, collection: "broker_accounts" })
export class BrokerAccount extends Document implements IBrokerAccount {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId: string;

  @Prop({
    type: Types.ObjectId,
    ref: Account.name,
    required: true,
    index: true,
  })
  authAccountId: string;

  @Prop({ required: true, default: "upstox" })
  providerId: string;

  @Prop({
    type: BrokerAccountProfileSchema,
    required: true,
  })
  profile: BrokerAccountProfile;

  @Prop({ required: true })
  broker: string;

  @Prop({
    type: [String],
    enum: Object.values(BrokerProduct),
    required: true,
  })
  products: BrokerProduct[];

  @Prop({
    type: [String],
    enum: Object.values(BrokerOrderType),
    required: true,
  })
  orderTypes: BrokerOrderType[];

  @Prop({
    type: [String],
    enum: Object.values(BrokerExchange),
    required: true,
  })
  exchanges: BrokerExchange[];

  @Prop({ type: BrokerAccountFundMarginSchema, required: true })
  fundMargin: BrokerAccountFundMargin;

  @Prop({ type: Date, default: Date.now })
  lastSyncAt: Date;

  // ─── Upstox Re-Auth Tracking ──────────────────────────────────────────
  // Note: accessToken/accessTokenExpiresAt live in better-auth's accounts
  // collection (same OAuth account record). broker_accounts tracks metadata only.

  @Prop({ type: Date, required: false })
  lastReAuthAt?: Date;

  // ─── Trading Controls ─────────────────────────────────────────────────

  @Prop({ type: Boolean, required: true, default: false })
  hasTradingEnabled: boolean;

  @Prop({
    type: [String],
    enum: Object.values(BrokerSegment),
    required: true,
    default: [],
  })
  tradingSegments: BrokerSegment[];

  @Prop({ type: Boolean, required: true, default: false })
  isDataCollectionEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const BrokerAccountSchema = SchemaFactory.createForClass(BrokerAccount);

// Unique index: one broker account per user per provider
BrokerAccountSchema.index({ userId: 1, providerId: 1 }, { unique: true });
