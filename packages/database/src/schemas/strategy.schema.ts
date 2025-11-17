/**
 * Strategy Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Strategy as IStrategy } from "@repo/schema";

export type StrategyDocument = HydratedDocument<Strategy>;

class StrategyLeg {
  @Prop()
  instrumentKey: string;

  @Prop()
  instrumentType: string;

  @Prop({ enum: ["BUY", "SELL"] })
  transactionType: string;

  @Prop()
  quantity: number;

  @Prop()
  price?: number;

  @Prop()
  orderType?: string;

  @Prop()
  triggerPrice?: number;

  @Prop()
  disclosedQuantity?: number;
}

class RiskProfile {
  @Prop()
  maxProfit?: number;

  @Prop()
  maxLoss?: number;

  @Prop({ type: [Number] })
  breakeven?: number[];

  @Prop()
  probabilityOfProfit?: number;
}

class EntryConditions {
  @Prop()
  minConfidence?: number;

  @Prop()
  maxVIX?: number;

  @Prop()
  minVIX?: number;

  @Prop({ enum: ["VOL_UP", "VOL_DOWN", "NEUTRAL"] })
  prediction?: string;
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
  type: string;

  @Prop()
  description?: string;

  @Prop({ type: [StrategyLeg] })
  legs: StrategyLeg[];

  @Prop({ type: RiskProfile })
  riskProfile?: RiskProfile;

  @Prop({ type: EntryConditions })
  entryConditions?: EntryConditions;

  @Prop({ type: ExitConditions })
  exitConditions?: ExitConditions;
}

export const StrategySchema = SchemaFactory.createForClass(Strategy);
