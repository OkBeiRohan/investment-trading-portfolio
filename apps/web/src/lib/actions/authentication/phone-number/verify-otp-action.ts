"use server";

import { parsePhoneOtpFormData } from "@repo/schema/authentication";
import type { LoginFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function verifyPhoneOtpAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const result = parsePhoneOtpFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.phoneNumber.verifyOtp({
    phoneNumber: result.data.phoneNumber,
    otp: result.data.code,
  });

  if (error) {
    return {
      error: error.message || "Invalid OTP. Please try again.",
      fieldErrors: null,
    };
  }

  // Phone OTP verification successful
  await handleAuthSuccess();
}
