"use client";

import { parseRegisterFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseRegisterFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { data, error } = await authClient.signUp.email({
    email: result.data.email,
    password: result.data.password,
    name: result.data.name,
  });

  if (error) {
    return {
      error: error.message || "Failed to create account. Please try again.",
      fieldErrors: null,
    };
  }

  // Check if email verification is required
  if (data?.emailVerificationRequired) {
    window.location.href = "/authentication/verify-email";
    return { error: null };
  }

  // If no email verification required, proceed with login
  window.location.href = "/";
  return { error: null };
}
