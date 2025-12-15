"use client";

import { parseResetPasswordFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseResetPasswordFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.resetPassword({
    newPassword: result.data.password,
  });

  if (error) {
    return {
      error:
        error.message || "Failed to reset password. The link may have expired.",
      fieldErrors: null,
    };
  }

  // Password reset successful - use centralized handler
  handleAuthSuccess();
  return { error: null };
}
