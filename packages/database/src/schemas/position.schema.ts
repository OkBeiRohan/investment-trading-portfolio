/**
 * Position Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Position as IPosition } from "@repo/schema";

export type PositionDocument = HydratedDocument<Position>;

class PositionLeg {
  @Prop()
  instrument: string;

  @Prop({ enum: ["BUY", "SELL"] })
  side: "BUY" | "SELL";

  @Prop()
  quantity: number;

  @Prop()
  entryPrice: number;

  @Prop()
  currentPrice: number;

  @Prop()
  pnl: number;
}

class Greeks {
  @Prop({ required: true })
  delta: number;

  @Prop({ required: true })
  gamma: number;

  @Prop({ required: true })
  vega: number;

  @Prop({ required: true })
  theta: number;

  @Prop()
  rho?: number;
}

class Costs {
  @Prop({ required: true })
  brokerage: number;

  @Prop({ required: true })
  stt: number;

  @Prop({ required: true })
  slippage: number;

  @Prop({ required: true })
  total: number;
}

@Schema({ timestamps: true, collection: "positions" })
export class Position
  implements Omit<IPosition, "_id" | "createdAt" | "updatedAt">
{
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  strategy?: string;

  @Prop({ required: true })
  instrument: string;

  @Prop({ required: true })
  instrumentKey: string;

  @Prop({
    required: true,
    enum: [
      "NSE_EQ",
      "NSE_FO",
      "NSE_INDEX",
      "BSE_EQ",
      "BSE_FO",
      "MCX_FO",
      "NYSE",
      "NASDAQ",
      "CRYPTO",
    ],
  })
  exchange:
    | "NSE_EQ"
    | "NSE_FO"
    | "NSE_INDEX"
    | "BSE_EQ"
    | "BSE_FO"
    | "MCX_FO"
    | "NYSE"
    | "NASDAQ"
    | "CRYPTO";

  @Prop({ type: [PositionLeg] })
  legs: PositionLeg[];

  @Prop({ type: Greeks })
  greeks?: Greeks;

  @Prop({ required: true })
  entryDate: Date;

  @Prop()
  exitDate?: Date;

  @Prop({ required: true, enum: ["OPEN", "CLOSED"], index: true })
  status: "OPEN" | "CLOSED";

  @Prop()
  realizedPnL?: number;

  @Prop({ required: true })
  unrealizedPnL: number;

  @Prop({ type: Costs, required: true })
  costs: Costs;

  @Prop({ required: true })
  provider: string;
}

export const PositionSchema = SchemaFactory.createForClass(Position);

// Compound indexes
PositionSchema.index({ userId: 1, status: 1 });
PositionSchema.index({ userId: 1, entryDate: -1 });
