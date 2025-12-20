import { z } from "zod";

/**
 * Trading Database - Broker Account Collection
 * Stores Upstox profile, fund margin, and account metadata
 */

export const BrokerAccountSchema = z.object({
  // Link to better-auth User
  userId: z.string().min(1),

  // Link to better-auth Account (OAuth account)
  authAccountId: z.string().min(1),

  // Provider identification
  providerId: z.string().default("upstox"),

  // User Profile (from /v2/user/profile)
  profile: z.object({
    userId: z.string(), // Upstox user_id
    userName: z.string(), // Upstox user_name
    userType: z.string(), // "individual", "corporate"
    email: z.string().email(),
    poa: z.boolean(), // Power of Attorney
  }),

  // Broker Details
  broker: z.string(), // "UPSTOX"

  // Products (e.g., ["D", "I"])
  products: z.array(z.string()),

  // Order Types (e.g., ["MARKET", "LIMIT", "SL", "SL-M"])
  orderTypes: z.array(z.string()),

  // Exchanges (e.g., ["NSE", "BSE", "NFO"])
  exchanges: z.array(z.string()),

  // Fund and Margin (from /v2/user/get-funds-and-margin)
  fundMargin: z.object({
    equity: z.object({
      usedMargin: z.number(),
      payinAmount: z.number(),
      spanMargin: z.number(),
      adhocMargin: z.number(),
      notionalCash: z.number(),
      availableMargin: z.number(),
      exposureMargin: z.number(),
    }),
    commodity: z.object({
      usedMargin: z.number(),
      payinAmount: z.number(),
      spanMargin: z.number(),
      adhocMargin: z.number(),
      notionalCash: z.number(),
      availableMargin: z.number(),
      exposureMargin: z.number(),
      optionPremium: z.number(),
      assignmentMargin: z.number(),
      witholdingAmount: z.number(),
      intraDayPayin: z.number(),
    }),
  }),

  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),

  // Last sync timestamp
  lastSyncAt: z.date().default(() => new Date()),
});

export type BrokerAccount = z.infer<typeof BrokerAccountSchema>;
