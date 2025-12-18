"use client";

import { parseRegisterFormData } from "@repo/schema/authentication";
import type { AuthFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const result = parseRegisterFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
      fieldValues: result.fieldValues,
    };
  }

  const { data, error } = await authClient.signUp.email(result.data);

  if (error) {
    return {
      error: error.message || "Failed to create account. Please try again.",
      fieldErrors: null,
      fieldValues: {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      },
    };
  }

  // Check if email verification is required
  //   if (data?.emailVerificationRequired) {
  //     window.location.href = "/authentication/verify-email";
  //     return { error: null };
  //   }

  // If no email verification required, use centralized handler
  handleAuthSuccess();
  console.log(data);
  return { error: null };
}
