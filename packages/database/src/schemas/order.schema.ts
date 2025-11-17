/**
 * Order Schema for NestJS Mongoose
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Order as IOrder } from "@repo/schema";

export type OrderDocument = HydratedDocument<Order>;

class OrderLeg {
  @Prop()
  instrument: string;

  @Prop()
  instrumentKey: string;

  @Prop({ enum: ["BUY", "SELL"] })
  side: "BUY" | "SELL";

  @Prop()
  quantity: number;

  @Prop({ enum: ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LOSS_MARKET"] })
  orderType: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_MARKET";

  @Prop()
  price?: number;

  @Prop()
  triggerPrice?: number;

  @Prop({
    enum: [
      "PENDING",
      "OPEN",
      "COMPLETE",
      "CANCELLED",
      "REJECTED",
      "TRIGGER_PENDING",
      "PARTIALLY_FILLED",
    ],
  })
  status:
    | "PENDING"
    | "OPEN"
    | "COMPLETE"
    | "CANCELLED"
    | "REJECTED"
    | "TRIGGER_PENDING"
    | "PARTIALLY_FILLED";

  @Prop()
  filledQuantity: number;

  @Prop()
  averagePrice?: number;

  @Prop()
  filledAt?: Date;
}

@Schema({ timestamps: true, collection: "orders" })
export class Order implements Omit<IOrder, "_id" | "createdAt" | "updatedAt"> {
  @Prop({ required: true, unique: true, index: true })
  orderId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ index: true })
  signalId?: string;

  @Prop()
  strategy?: string;

  @Prop({ type: [OrderLeg] })
  legs: OrderLeg[];

  @Prop({
    required: true,
    enum: [
      "PENDING",
      "OPEN",
      "COMPLETE",
      "CANCELLED",
      "REJECTED",
      "TRIGGER_PENDING",
      "PARTIALLY_FILLED",
    ],
    index: true,
  })
  status:
    | "PENDING"
    | "OPEN"
    | "COMPLETE"
    | "CANCELLED"
    | "REJECTED"
    | "TRIGGER_PENDING"
    | "PARTIALLY_FILLED";

  @Prop({ required: true })
  totalCost: number;

  @Prop({ required: true })
  provider: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Compound indexes
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, userId: 1 });
OrderSchema.index({ provider: 1, createdAt: -1 });
