import { z } from "zod";

/**
 * Register DTO Schema
 * Used for email/password registration
 */
export const RegisterDtoSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.email({ message: "Email is required" }).min(1, "Email is required"),
  password: z
    .string({ message: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  rememberMe: z
    .string()
    .optional()
    .default("off")
    .transform((val) => val === "on"),
});

export type IRegisterDto = z.infer<typeof RegisterDtoSchema>;

/**
 * Treeified error type from Zod
 */
export type RegisterFieldErrors = z.core.$ZodErrorTree<IRegisterDto>;

/**
 * Result type for form validation
 */
export type RegisterFormResult =
  | { success: true; data: IRegisterDto }
  | {
      success: false;
      fieldErrors: RegisterFieldErrors;
      fieldValues: Record<string, any>;
    };

/**
 * Helper to parse and validate FormData into RegisterDto
 * Returns Zod's treeified error format and preserves field values on error
 */
export function parseRegisterFormData(formData: FormData): RegisterFormResult {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
  };

  const result = RegisterDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: z.treeifyError(result.error),
      fieldValues: rawData,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
