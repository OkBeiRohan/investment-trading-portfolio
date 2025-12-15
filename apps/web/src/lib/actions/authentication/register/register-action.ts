"use server";

import { redirect, type Route } from "next/navigation";
import { parseRegisterFormData } from "@repo/schema/authentication";
import type { LoginFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";
import { handleAuthSuccess } from "../index";

export async function registerAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
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
    redirect("/authentication/verify-email" as Route);
  }

  // If no email verification required, proceed with login
  await handleAuthSuccess();
}
