"use client";

import { parseEmailOtpVerifyFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function verifyEmailOtpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseEmailOtpVerifyFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
      fieldValues: result.fieldValues,
    };
  }

  const { error } = await authClient.signIn.emailOtp({
    email: result.data.email,
    otp: result.data.code,
  });

  if (error) {
    return {
      error: error.message || "Invalid OTP. Please try again.",
      fieldErrors: null,
      fieldValues: {
        code: formData.get("code") as string,
      },
    };
  }

  // Email OTP verification successful - use centralized handler
  handleAuthSuccess();
  return { error: null };
}
