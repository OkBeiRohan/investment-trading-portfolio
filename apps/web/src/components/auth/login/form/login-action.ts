"use client";

import { authClient } from "@/lib/auth/auth-client";
import { redirect } from "next/navigation";
import { type LoginFieldErrors, parseLoginFormData } from "@repo/schema";

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

  const credentials = result.data;

  // Authenticate
  try {
    const { data, error } = await authClient.signIn.email(credentials);

    if (error) {
      return { error: error.message || "Invalid credentials" };
    }

    if (!data) {
      return { error: "Authentication failed" };
    }

    // Successful login - redirect will happen after this returns
    redirect("/");
  } catch (err) {
    // If redirect throws (expected behavior), re-throw it
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }

    console.error("Login error:", err);
    return { error: "An unexpected error occurred" };
  }
}
