"use client";

import { authClient } from "@/lib/auth/auth-client";
import { type LoginFieldErrors, parseLoginFormData } from "@repo/schema";
import { handleAuthSuccess } from "@/lib/actions/authentication";

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

    // Successful login - handle callback URL redirect and session refresh
    // This throws a redirect error, so execution stops here
    await handleAuthSuccess();

    // TypeScript needs this, but it's never reached (handleAuthSuccess always throws)
    return { error: null };
  } catch (err) {
    // If redirect throws (expected behavior), re-throw it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }

    console.error("Login error:", err);
    return { error: "An unexpected error occurred" };
  }
}
