import { z } from "zod";

/**
 * Enable Two-Factor Authentication Schema
 */
export const enableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type EnableTwoFactor = z.infer<typeof enableTwoFactorSchema>;

/**
 * Verify Two-Factor Setup Schema
 */
export const verifyTwoFactorSetupSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export type VerifyTwoFactorSetup = z.infer<typeof verifyTwoFactorSetupSchema>;

/**
 * Disable Two-Factor Authentication Schema
 */
export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type DisableTwoFactor = z.infer<typeof disableTwoFactorSchema>;

/**
 * Two-Factor Setup Response Schema
 */
export const twoFactorSetupResponseSchema = z.object({
  secret: z.string(),
  qrCodeUrl: z.url(),
  backupCodes: z.array(z.string()).length(10),
});

export type TwoFactorSetupResponse = z.infer<
  typeof twoFactorSetupResponseSchema
>;
