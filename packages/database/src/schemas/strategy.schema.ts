/**
 * Strategy Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Strategy as IStrategy } from "@repo/schema";

export type StrategyDocument = HydratedDocument<Strategy>;

class StrategyLeg {
  @Prop({ required: true })
  instrumentKey: string;

  @Prop({
    enum: [
      "EQUITY",
      "FUTURES",
      "OPTIONS",
      "CURRENCY",
      "COMMODITY",
      "INDEX",
      "CRYPTO",
    ],
  })
  instrumentType?:
    | "EQUITY"
    | "FUTURES"
    | "OPTIONS"
    | "CURRENCY"
    | "COMMODITY"
    | "INDEX"
    | "CRYPTO";

  @Prop({ required: true, enum: ["BUY", "SELL"] })
  transactionType: "BUY" | "SELL";

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ enum: ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"] })
  orderType: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_MARKET";

  @Prop()
  triggerPrice?: number;

  @Prop()
  disclosedQuantity?: number;
}

class RiskProfile {
  @Prop({ required: true })
  maxProfit: number;

  @Prop({ required: true })
  maxLoss: number;

  @Prop({ required: true, type: [Number] })
  breakeven: number[];

  @Prop()
  probabilityOfProfit?: number;
}

class EntryConditions {
  @Prop({ required: true })
  minConfidence: number;

  @Prop()
  maxVIX?: number;

  @Prop()
  minVIX?: number;

  @Prop({ enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"] })
  prediction?: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";
}

class ExitConditions {
  @Prop()
  profitTarget?: number;

  @Prop()
  stopLoss?: number;

  @Prop()
  timeBasedExit?: number;
}

@Schema({ timestamps: true, collection: "strategies" })
export class Strategy
  implements Omit<IStrategy, "_id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: [
      "LONG_STRADDLE",
      "SHORT_STRADDLE",
      "LONG_STRANGLE",
      "SHORT_STRANGLE",
      "IRON_CONDOR",
      "IRON_BUTTERFLY",
      "BULL_CALL_SPREAD",
      "BEAR_PUT_SPREAD",
      "BULL_PUT_SPREAD",
      "BEAR_CALL_SPREAD",
      "CALENDAR_SPREAD",
      "DIAGONAL_SPREAD",
    ],
  })
  type:
    | "LONG_STRADDLE"
    | "SHORT_STRADDLE"
    | "LONG_STRANGLE"
    | "SHORT_STRANGLE"
    | "IRON_CONDOR"
    | "IRON_BUTTERFLY"
    | "BULL_CALL_SPREAD"
    | "BEAR_PUT_SPREAD"
    | "BULL_PUT_SPREAD"
    | "BEAR_CALL_SPREAD"
    | "CALENDAR_SPREAD"
    | "DIAGONAL_SPREAD";

  @Prop()
  description?: string;

  @Prop({ type: [StrategyLeg], required: true })
  legs: StrategyLeg[];

  @Prop({ type: RiskProfile, required: true })
  riskProfile: RiskProfile;

  @Prop({ type: EntryConditions })
  entryConditions?: EntryConditions;

  @Prop({ type: ExitConditions })
  exitConditions?: ExitConditions;
}

export const StrategySchema = SchemaFactory.createForClass(Strategy);
