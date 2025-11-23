import { z } from "zod";
import { userRoleEnum } from "./user.enums";
import { authProviderSchema } from "../authentication/provider.schema";
import { Types } from "mongoose";

/**
 * User Base Schema
 * Core user fields shared across operations
 */
export const userSchema = z.object({
  _id: z.instanceof(Types.ObjectId),
  email: z.email().toLowerCase(),
  emailVerified: z.boolean().default(false),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .nullable(),
  phoneVerified: z.boolean().default(false),
  avatarUrl: z.url().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  timezone: z.string().default("UTC"),
  currency: z.string().length(3).default("USD"), // ISO 4217
  isActive: z.boolean().default(true),
  isBlocked: z.boolean().default(false),
  roles: z
    .array(userRoleEnum)
    .default(["Investor"])
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Roles must be unique.",
    }),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorSecret: z.string().optional().nullable(),
  lastLoginAt: z.date().optional().nullable(),
  passwordChangedAt: z.date().optional().nullable(),
  accounts: z.array(authProviderSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional().nullable(), // Soft delete
});

export type IUser = z.infer<typeof userSchema>;

/**
 * Public User Schema
 * Safe fields to expose to clients (excludes sensitive data)
 */
export const userPublicSchema = userSchema.pick({
  _id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  country: true,
  timezone: true,
  currency: true,
  role: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export type IUserPublic = z.infer<typeof userPublicSchema>;

/**
 * User ID Parameter Schema
 */
export const userIdSchema = userSchema.pick({
  _id: true,
});

export type IUserId = z.infer<typeof userIdSchema>;
