import { z } from "zod";

/**
 * Login DTO Schema
 * Used for email/password authentication
 */
export const LoginDtoSchema = z.object({
  email: z
    .string({ message: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string({ message: "Password is required" })
    .min(1, "Password is required"),
});

export type ILoginDto = z.infer<typeof LoginDtoSchema>;

/**
 * Field errors type matching Zod's flatten structure
 */
export type LoginFieldErrors = {
  [K in keyof ILoginDto]?: string[];
};

/**
 * Result type for form validation
 */
export type LoginFormResult =
  | { success: true; data: ILoginDto }
  | { success: false; fieldErrors: LoginFieldErrors };

/**
 * Helper to parse and validate FormData into LoginDto
 * Returns Zod's default validation error format
 */
export function parseLoginFormData(formData: FormData): LoginFormResult {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = LoginDtoSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
