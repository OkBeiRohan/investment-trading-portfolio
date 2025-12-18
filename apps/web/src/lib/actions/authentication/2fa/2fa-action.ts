"use client";

import { parseTwoFactorFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function twoFactorAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseTwoFactorFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
      fieldValues: result.fieldValues,
    };
  }

  const { error } = await authClient.twoFactor.verifyOtp({
    code: result.data.code,
  });

  if (error) {
    return {
      error: error.message || "Invalid verification code. Please try again.",
      fieldErrors: null,
      fieldValues: {
        code: formData.get("code") as string,
      },
    };
  }

  // 2FA verification successful - use centralized handler
  handleAuthSuccess();
  return { error: null };
}
