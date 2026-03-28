import { z } from "zod";

export const tradingSignalSchema = z.object({
  instrumentKey: z.string(),
  timestamp: z.string().datetime(),
  finalScore: z.number(),
  confidenceWeights: z.array(z.number()),
  regimeState: z.number().int().min(0).max(3),
  tierPredictions: z.record(z.string(), z.number()),
  latencyMs: z.number(),
  modelVersions: z.record(z.string(), z.string()).optional(),
  features: z.record(z.string(), z.number()).optional(),
});

export type TradingSignal = z.infer<typeof tradingSignalSchema>;

export const orderRecordSchema = z.object({
  orderId: z.string(),
  experimentId: z.string().optional(),
  algoId: z.string().optional(),
  instrumentKey: z.string(),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]),
  quantity: z.number().int().positive(),
  price: z.number().optional(),
  triggerPrice: z.number().optional(),
  status: z.enum(["PENDING", "FILLED", "PARTIALLY_FILLED", "CANCELLED", "REJECTED", "FAILED"]),
  fillPrice: z.number().optional(),
  fillQuantity: z.number().optional(),
  pnl: z.number().optional(),
  signalScore: z.number(),
  strategyName: z.string(),
  sandbox: z.boolean(),
  clientIp: z.string().optional(),
  latencyMs: z.number().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type OrderRecord = z.infer<typeof orderRecordSchema>;
