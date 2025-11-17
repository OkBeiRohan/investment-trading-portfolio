import { z } from "zod";
import { userPublicSchema } from "./user.schema";

/**
 * Password validation regex patterns
 */
const PASSWORD_REGEX = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /[0-9]/,
  SPECIAL: /[^A-Za-z0-9]/,
};

/**
 * Password validation schema (reusable)
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_REGEX.MIN_LENGTH, "Password must be at least 8 characters")
  .max(PASSWORD_REGEX.MAX_LENGTH, "Password must not exceed 128 characters")
  .regex(
    PASSWORD_REGEX.UPPERCASE,
    "Password must contain at least one uppercase letter"
  )
  .regex(
    PASSWORD_REGEX.LOWERCASE,
    "Password must contain at least one lowercase letter"
  )
  .regex(PASSWORD_REGEX.NUMBER, "Password must contain at least one number")
  .regex(
    PASSWORD_REGEX.SPECIAL,
    "Password must contain at least one special character"
  );

/**
 * User Registration Schema
 */
export const userRegisterSchema = z
  .object({
    email: z.email().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    dateOfBirth: z.iso.datetime().or(z.date()).optional(),
    country: z.string().length(2).optional(),
    timezone: z.string().optional(),
    currency: z.string().length(3).optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UserRegister = z.infer<typeof userRegisterSchema>;

/**
 * User Login Schema
 */
export const userLoginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().length(6).optional(), // TOTP code
});

export type UserLogin = z.infer<typeof userLoginSchema>;

/**
 * Refresh Token Schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshToken = z.infer<typeof refreshTokenSchema>;

/**
 * Authentication Response Schema
 */
export const authResponseSchema = z.object({
  user: userPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(), // seconds until access token expires
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
