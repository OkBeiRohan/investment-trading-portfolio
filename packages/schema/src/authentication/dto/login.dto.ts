import { z } from "zod";

/**
 * Login DTO Schema
 * Used for email/password authentication
 */
export const LoginDtoSchema = z.object({
  email: z.email({ message: "Email is required" }).min(1, "Email is required"),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
  rememberMe: z
    .string()
    .optional()
    .default("off")
    .transform((val) => val === "on"),
});

export type ILoginDto = z.infer<typeof LoginDtoSchema>;

/**
 * Treeified error type from Zod
 */
export type LoginFieldErrors = z.core.$ZodErrorTree<ILoginDto>;

/**
 * Result type for form validation
 */
export type LoginFormResult =
  | { success: true; data: ILoginDto }
  | { success: false; fieldErrors: LoginFieldErrors };

/**
 * Helper to parse and validate FormData into LoginDto
 * Returns Zod's treeified error format
 */
export function parseLoginFormData(formData: FormData): LoginFormResult {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
  };

  const result = LoginDtoSchema.safeParse(rawData);

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
