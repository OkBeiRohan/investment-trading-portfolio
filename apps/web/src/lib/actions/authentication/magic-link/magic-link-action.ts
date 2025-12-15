"use server";

import { parseMagicLinkFormData } from "@repo/schema/authentication";
import type { LoginFormState } from "@repo/schema/authentication";
import { authClient } from "@/lib/auth/auth-client";

export async function magicLinkAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const result = parseMagicLinkFormData(formData);

  if (!result.success) {
    return {
      error: null,
      fieldErrors: result.fieldErrors,
    };
  }

  const { error } = await authClient.signIn.magicLink({
    email: result.data.email,
    callbackURL: "/",
  });

  if (error) {
    return {
      error: error.message || "Failed to send magic link. Please try again.",
      fieldErrors: null,
    };
  }

  return {
    error: null,
    fieldErrors: null,
    success: "Magic link sent! Check your email to sign in.",
  };
}
