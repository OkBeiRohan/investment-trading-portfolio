import { z } from "zod";

/**
 * Verify Email Schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type VerifyEmail = z.infer<typeof verifyEmailSchema>;

/**
 * Resend Verification Email Schema
 */
export const resendVerificationEmailSchema = z.object({
  email: z.email().toLowerCase(),
});

export type ResendVerificationEmail = z.infer<
  typeof resendVerificationEmailSchema
>;

/**
 * Email Verification Token Schema
 */
export const emailVerificationTokenSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean().default(false),
  createdAt: z.date(),
});

export type EmailVerificationToken = z.infer<
  typeof emailVerificationTokenSchema
>;
