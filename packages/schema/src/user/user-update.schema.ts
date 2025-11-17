import { z } from "zod";
import { userSchema } from "./user.schema";

/**
 * Update User Profile Schema
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .nullable(),
  avatarUrl: z.url().optional().nullable(),
  dateOfBirth: z.iso.datetime().or(z.date()).optional().nullable(),
  country: z.string().length(2).optional().nullable(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
});

export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

/**
 * Update User Email Schema
 */
export const updateUserEmailSchema = z.object({
  newEmail: z.email().toLowerCase(),
  password: z.string().min(1, "Password is required for email change"),
});

export type UpdateUserEmail = z.infer<typeof updateUserEmailSchema>;

/**
 * Admin Update User Schema (for admin operations)
 */
export const adminUpdateUserSchema = userSchema
  .pick({
    firstName: true,
    lastName: true,
    phoneNumber: true,
    phoneVerified: true,
    emailVerified: true,
    isActive: true,
    isBlocked: true,
    role: true,
  })
  .partial();

export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;
