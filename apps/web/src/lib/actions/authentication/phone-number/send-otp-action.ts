"use server";

import { parsePhoneNumberFormData } from "@repo/schema/authentication";
import type { LoginFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";

export async function sendPhoneOtpAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const result = parsePhoneNumberFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.phoneNumber.sendOtp({
    phoneNumber: result.data.phoneNumber,
  });

  if (error) {
    return {
      error: error.message || "Failed to send OTP. Please try again.",
      fieldErrors: null,
    };
  }

  return {
    error: null,
    fieldErrors: null,
    success: "OTP sent! Check your phone for the verification code.",
  };
}
