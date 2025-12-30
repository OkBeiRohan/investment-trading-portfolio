"use client";

import { authClient } from "@/lib/auth/auth-client";

/**
 * Disable 2FA for the current user
 * Requires password confirmation
 */
export async function disable2FA(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await authClient.twoFactor.disable({
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to disable 2FA",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("2FA disable error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
