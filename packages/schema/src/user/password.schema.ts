import { z } from "zod";
import { passwordSchema } from "./auth.schema";

/**
 * Forgot Password Schema
 */
export const forgotPasswordSchema = z.object({
  email: z.email().toLowerCase(),
});

export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset Password Schema
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPassword = z.infer<typeof resetPasswordSchema>;

/**
 * Change Password Schema (for authenticated users)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePassword = z.infer<typeof changePasswordSchema>;

/**
 * Password Reset Token Schema
 */
export const passwordResetTokenSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean().default(false),
  createdAt: z.date(),
});

export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
