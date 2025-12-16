import z from "zod";

/**
 * User Role Enum
 */
export const USER_ROLES = ["Investor", "Trader", "Admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  email: string;
  emailVerified: boolean;
  name: string;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
  image?: string | null;
  dateOfBirth?: Date | null;
  country?: string | null;
  isActive: boolean;
  isBlocked: boolean;
  role: UserRole;
  twoFactorEnabled?: boolean | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const userSchema: z.ZodType<IUser> = z.object({
  email: z.email().toLowerCase(),
  emailVerified: z.boolean().default(false),
  name: z.string().min(1).max(200),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .nullable(),
  phoneNumberVerified: z.boolean().default(false),
  image: z.url().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
  isActive: z.boolean().default(true),
  isBlocked: z.boolean().default(false),
  role: z.enum(USER_ROLES).default("Investor"),
  twoFactorEnabled: z.boolean().default(false),
  lastLoginAt: z.date().optional().nullable(),
  passwordChangedAt: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
