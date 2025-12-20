import { z } from "zod";

/**
 * Broker Provider Types
 */
export const BrokerProvider = {
  UPSTOX: "upstox",
  // Future: ZERODHA: "zerodha",
  // Future: FYERS: "fyers",
} as const;

export type BrokerProvider =
  (typeof BrokerProvider)[keyof typeof BrokerProvider];

/**
 * Broker Account Link Status
 */
export const brokerAccountLinkSchema = z.object({
  userId: z.string(),
  providerId: z.enum(["upstox"]),
  accountId: z.string().describe("Broker's user ID (e.g., Upstox user_id)"),
  accessToken: z.string().describe("OAuth access token for broker API"),
  refreshToken: z
    .string()
    .optional()
    .describe("OAuth refresh token (if supported)"),
  accessTokenExpiresAt: z.date().describe("Token expiry timestamp"),
  refreshTokenExpiresAt: z.date().optional(),
  scope: z.string().optional().describe("OAuth scopes granted"),
  linkedAt: z.date().describe("When the account was linked"),
  lastUsedAt: z.date().optional().describe("Last time the token was used"),
});

export type BrokerAccountLink = z.infer<typeof brokerAccountLinkSchema>;

/**
 * Broker Account Link Request
 */
export const linkBrokerAccountSchema = z.object({
  providerId: z.enum(["upstox"]),
  callbackURL: z.string().optional(),
  errorCallbackURL: z.string().optional(),
});

export type LinkBrokerAccountRequest = z.infer<typeof linkBrokerAccountSchema>;

/**
 * Unlink Broker Account Request
 */
export const unlinkBrokerAccountSchema = z.object({
  providerId: z.enum(["upstox"]),
});

export type UnlinkBrokerAccountRequest = z.infer<
  typeof unlinkBrokerAccountSchema
>;
