import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { BrokerAccount as IBrokerAccount } from "@repo/schema";
import { User } from "../user/user.schema";
import { Account } from "../authentication/account.schema";

@Schema({ timestamps: true, collection: "broker_accounts" })
export class BrokerAccount extends Document implements Partial<IBrokerAccount> {
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
    type: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
      userType: { type: String, required: true },
      email: { type: String, required: true },
      poa: { type: Boolean, required: true },
    },
    required: true,
  })
  profile: {
    userId: string;
    userName: string;
    userType: string;
    email: string;
    poa: boolean;
  };

  @Prop({ required: true })
  broker: string;

  @Prop({ type: [String], required: true })
  products: string[];

  @Prop({ type: [String], required: true })
  orderTypes: string[];

  @Prop({ type: [String], required: true })
  exchanges: string[];

  @Prop({
    type: {
      equity: {
        usedMargin: { type: Number, required: true },
        payinAmount: { type: Number, required: true },
        spanMargin: { type: Number, required: true },
        adhocMargin: { type: Number, required: true },
        notionalCash: { type: Number, required: true },
        availableMargin: { type: Number, required: true },
        exposureMargin: { type: Number, required: true },
      },
      commodity: {
        usedMargin: { type: Number, required: true },
        payinAmount: { type: Number, required: true },
        spanMargin: { type: Number, required: true },
        adhocMargin: { type: Number, required: true },
        notionalCash: { type: Number, required: true },
        availableMargin: { type: Number, required: true },
        exposureMargin: { type: Number, required: true },
        optionPremium: { type: Number, required: true },
        assignmentMargin: { type: Number, required: true },
        witholdingAmount: { type: Number, required: true },
        intraDayPayin: { type: Number, required: true },
      },
    },
    required: true,
  })
  fundMargin: {
    equity: {
      usedMargin: number;
      payinAmount: number;
      spanMargin: number;
      adhocMargin: number;
      notionalCash: number;
      availableMargin: number;
      exposureMargin: number;
    };
    commodity: {
      usedMargin: number;
      payinAmount: number;
      spanMargin: number;
      adhocMargin: number;
      notionalCash: number;
      availableMargin: number;
      exposureMargin: number;
      optionPremium: number;
      assignmentMargin: number;
      witholdingAmount: number;
      intraDayPayin: number;
    };
  };

  @Prop({ type: Date, default: Date.now })
  lastSyncAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const BrokerAccountSchema = SchemaFactory.createForClass(BrokerAccount);

// Unique index: one broker account per user per provider
BrokerAccountSchema.index({ userId: 1, providerId: 1 }, { unique: true });
