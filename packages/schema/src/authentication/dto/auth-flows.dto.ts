import { z } from "zod";

/**
 * Generic form state type for authentication actions
 */
export interface AuthFormState {
  error: string | null;
  fieldErrors?: any;
  success?: string;
}

/**
 * Forgot Password DTO Schema
 */
export const ForgotPasswordDtoSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email address"),
});

export type IForgotPasswordDto = z.infer<typeof ForgotPasswordDtoSchema>;
export type ForgotPasswordFieldErrors =
  z.core.$ZodErrorTree<IForgotPasswordDto>;

export type ForgotPasswordFormResult =
  | { success: true; data: IForgotPasswordDto }
  | { success: false; fieldErrors: ForgotPasswordFieldErrors };

export function parseForgotPasswordFormData(
  formData: FormData
): ForgotPasswordFormResult {
  const result = ForgotPasswordDtoSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Reset Password DTO Schema
 */
export const ResetPasswordDtoSchema = z
  .object({
    password: z
      .string({ message: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number"
      ),
    confirmPassword: z.string({ message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type IResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
export type ResetPasswordFieldErrors = z.core.$ZodErrorTree<IResetPasswordDto>;

export type ResetPasswordFormResult =
  | { success: true; data: IResetPasswordDto }
  | { success: false; fieldErrors: ResetPasswordFieldErrors };

export function parseResetPasswordFormData(
  formData: FormData
): ResetPasswordFormResult {
  const result = ResetPasswordDtoSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Two Factor DTO Schema
 */
export const TwoFactorDtoSchema = z.object({
  code: z
    .string({ message: "Verification code is required" })
    .length(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type ITwoFactorDto = z.infer<typeof TwoFactorDtoSchema>;
export type TwoFactorFieldErrors = z.core.$ZodErrorTree<ITwoFactorDto>;

export type TwoFactorFormResult =
  | { success: true; data: ITwoFactorDto }
  | { success: false; fieldErrors: TwoFactorFieldErrors };

export function parseTwoFactorFormData(
  formData: FormData
): TwoFactorFormResult {
  const result = TwoFactorDtoSchema.safeParse({
    code: formData.get("code"),
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Magic Link DTO Schema
 */
export const MagicLinkDtoSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email address"),
});

export type IMagicLinkDto = z.infer<typeof MagicLinkDtoSchema>;
export type MagicLinkFieldErrors = z.core.$ZodErrorTree<IMagicLinkDto>;

export type MagicLinkFormResult =
  | { success: true; data: IMagicLinkDto }
  | { success: false; fieldErrors: MagicLinkFieldErrors };

export function parseMagicLinkFormData(
  formData: FormData
): MagicLinkFormResult {
  const result = MagicLinkDtoSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
