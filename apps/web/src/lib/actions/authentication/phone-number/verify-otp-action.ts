"use client";

import { parsePhoneOtpFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function verifyPhoneOtpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parsePhoneOtpFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.phoneNumber.verify({
    phoneNumber: result.data.phoneNumber,
    code: result.data.code,
  });

  if (error) {
    return {
      error: error.message || "Invalid OTP. Please try again.",
      fieldErrors: null,
    };
  }

  // Phone OTP verification successful - use centralized handler
  handleAuthSuccess();
  return { error: null };
}
