"use server";

import { parseTwoFactorFormData } from "@repo/schema/authentication";
import type { LoginFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function twoFactorAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const result = parseTwoFactorFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.twoFactor.verifyOtp({
    code: result.data.code,
  });

  if (error) {
    return {
      error: error.message || "Invalid verification code. Please try again.",
      fieldErrors: null,
    };
  }

  // 2FA verification successful
  await handleAuthSuccess(false);
}
