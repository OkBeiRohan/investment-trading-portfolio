"use client";

import { parseForgotPasswordFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseForgotPasswordFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
      fieldValues: result.fieldValues,
    };
  }

  const { error } = await authClient.forgetPassword.emailOtp({
    email: result.data.email,
  });

  if (error) {
    return {
      error: error.message || "Failed to send reset email. Please try again.",
      fieldErrors: null,
      fieldValues: {
        email: formData.get("email") as string,
      },
    };
  }

  return {
    error: null,
    fieldErrors: null,
    success: "Password reset email sent! Check your inbox.",
  };
}
