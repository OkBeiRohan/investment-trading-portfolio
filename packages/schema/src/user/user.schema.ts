import { z } from "zod";

/**
 * User Role Enum
 */
export const userRoleEnum = z.enum(["Investor", "Trader", "Admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

/**
 * User Base Schema
 * Core user fields shared across operations
 */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().toLowerCase(),
  emailVerified: z.boolean().default(false),
  name: z.string().min(1).max(200),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .nullable(),
  phoneVerified: z.boolean().default(false),
  image: z.url().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  isActive: z.boolean().default(true),
  isBlocked: z.boolean().default(false),
  role: z
    .array(userRoleEnum)
    .default(["Investor"])
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Roles must be unique.",
    }),
  twoFactorEnabled: z.boolean().default(false),
  lastLoginAt: z.date().optional().nullable(),
  passwordChangedAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IUser = z.infer<typeof userSchema>;

/**
 * Public User Schema
 * Safe fields to expose to clients (excludes sensitive data)
 */
export const userPublicSchema = userSchema.pick({
  id: true,
  email: true,
  emailVerified: true,
  name: true,
  image: true,
  country: true,
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
  id: true,
});

export type IUserId = z.infer<typeof userIdSchema>;
