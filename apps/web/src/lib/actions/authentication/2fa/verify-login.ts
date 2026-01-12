"use client";

import { authClient } from "@/lib/auth/auth-client";

/**
 * Verify TOTP code during login
 * This is called after user signs in with email/password
 */
export async function verifyLoginTotp(
  code: string,
  trustDevice: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await authClient.twoFactor.verifyTotp({
      code,
      trustDevice,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Invalid verification code",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Verify login TOTP error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Verify backup code during login
 * Backup codes are single-use
 */
export async function verifyBackupCode(
  code: string,
  trustDevice: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await authClient.twoFactor.verifyBackupCode({
      code,
      trustDevice,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Invalid backup code",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Verify backup code error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
