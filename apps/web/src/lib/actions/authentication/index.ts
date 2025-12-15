"use client";

import { CallbackUrlSchema } from "@repo/schema";

/**
 * Handle successful authentication (client-side)
 * - Checks if 2FA verification is required
 * - Retrieves callback URL from sessionStorage (set by middleware)
 * - Clears the callback URL from sessionStorage
 * - Performs full page redirect (causes session refetch in providers)
 * - Falls back to "/" if no valid callback URL exists
 *
 * @param requiresTwoFactor - If true, user needs to complete 2FA verification
 */
export function handleAuthSuccess(requiresTwoFactor: boolean = false): void {
  // If 2FA is required, redirect to 2FA verification page
  if (requiresTwoFactor) {
    window.location.href = "/authentication/2fa";
    return;
  }

  // Get callback URL from sessionStorage
  const callbackUrl = sessionStorage.getItem("auth.callbackUrl");

  // Clear the callback URL
  sessionStorage.removeItem("auth.callbackUrl");

  // Validate and redirect
  if (callbackUrl) {
    const validationResult = CallbackUrlSchema.safeParse(callbackUrl);
    if (validationResult.success && validationResult.data) {
      // Full redirect causes browser to refetch everything,
      // including session data in providers
      window.location.href = validationResult.data;
      return;
    }
  }

  // Default redirect to home
  window.location.href = "/";
}
