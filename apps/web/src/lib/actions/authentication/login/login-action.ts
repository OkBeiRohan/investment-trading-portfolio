"use client";

import { authClient } from "@/lib/auth/auth-client";
import { type LoginFieldErrors, parseLoginFormData } from "@repo/schema";
import { handleAuthSuccess } from "../index";

interface LoginState {
  error: string | null;
  fieldErrors?: LoginFieldErrors;
}

export async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  // Parse and validate form data
  const result = parseLoginFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  // Authenticate
  try {
    const { data, error } = await authClient.signIn.email(result.data);

    if (error) {
      return { error: error.message || "Invalid credentials" };
    }

    if (!data) {
      return { error: "Authentication failed" };
    }

    // Check if 2FA verification is required
    const requiresTwoFactor = data?.redirect === true;

    // Use centralized auth success handler (handles callback URL from sessionStorage)
    handleAuthSuccess(requiresTwoFactor);
    return { error: null };
  } catch (err) {
    console.error("Login error:", err);
    return { error: "An unexpected error occurred" };
  }
}
