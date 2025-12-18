"use client";

import { parseEmailOtpFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";

export async function sendEmailOtpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseEmailOtpFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.emailOTP.sendVerificationCode({
    email: result.data.email,
    type: "sign-in", // or "email-verification" depending on context, for login it's usually sign-in
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
    success: "OTP sent! Check your email for the verification code.",
  };
}
