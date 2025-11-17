/**
 * Order Schemas
 * Order placement, execution, and tracking
 */

import { z } from "zod";
import { TransactionTypeEnum, OrderTypeEnum, OrderStatusEnum } from "./enums";
import {
  mongoDocumentSchema,
  userScopedSchema,
  timestampSchema,
  baseOrderLegSchema,
  baseInstrumentSchema,
  providerSchema,
} from "./base";

// ============================================
// Order Leg (extends base with execution details)
// ============================================

export const orderLegSchema = baseInstrumentSchema.extend({
  side: TransactionTypeEnum,
  quantity: z.number().positive(),
  orderType: OrderTypeEnum,
  price: z.number().nonnegative().optional(),
  triggerPrice: z.number().nonnegative().optional(),
  status: OrderStatusEnum,
  filledQuantity: z.number().nonnegative(),
  averagePrice: z.number().nonnegative().optional(),
  filledAt: z.date().optional(),
});

export type OrderLeg = z.infer<typeof orderLegSchema>;

// ============================================
// Multi-Leg Order
// ============================================

export const orderSchema = mongoDocumentSchema
  .merge(userScopedSchema)
  .merge(providerSchema)
  .extend({
    orderId: z.string(), // Exchange order ID
    signalId: z.string().optional(), // Reference to trading signal
    strategy: z.string().optional(), // Strategy name
    legs: z.array(orderLegSchema),
    status: OrderStatusEnum,
    totalCost: z.number(),
  })
  .merge(timestampSchema);

export type Order = z.infer<typeof orderSchema>;

// ============================================
// Order Placement Request (for API)
// ============================================

export const orderPlacementSchema = baseOrderLegSchema.extend({
  instrument: z.string(),
  validity: z.enum(["DAY", "IOC", "GTC"]).optional(),
  productType: z.enum(["INTRADAY", "DELIVERY"]).optional(),
});

export type OrderPlacement = z.infer<typeof orderPlacementSchema>;

// ============================================
// Multi-Leg Order Request
// ============================================

export const multiLegOrderRequestSchema = z.object({
  strategy: z.string(),
  legs: z.array(orderPlacementSchema),
  executionPolicy: z.enum(["SIMULTANEOUS", "SEQUENTIAL", "LEGGING"]).optional(),
});

export type MultiLegOrderRequest = z.infer<typeof multiLegOrderRequestSchema>;

// ============================================
// Type Utilities
// ============================================

export type OrderCreateInput = Omit<Order, "_id" | "createdAt" | "updatedAt">;
export type OrderUpdateInput = Partial<
  Omit<Order, "_id" | "userId" | "orderId" | "createdAt" | "updatedAt">
>;
