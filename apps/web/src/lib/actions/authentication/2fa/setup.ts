"use client";

import { authClient } from "@/lib/auth/auth-client";

interface SetupResult {
  success: boolean;
  error?: string;
  totpURI?: string;
  backupCodes?: string[];
}

/**
 * Step 1: Enable TOTP 2FA
 * This generates encrypted secret and backup codes
 * Note: twoFactorEnabled won't be true until user verifies TOTP
 */
export async function enable2FA(password: string): Promise<SetupResult> {
  try {
    const { data, error } = await authClient.twoFactor.enable({
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to enable 2FA",
      };
    }

    return {
      success: true,
      totpURI: data?.totpURI,
      backupCodes: data?.backupCodes || [],
    };
  } catch (error) {
    console.error("Enable 2FA error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Step 2: Get TOTP URI for QR code generation
 * This must be called AFTER enable2FA()
 */
export async function getTotpUri(password: string): Promise<SetupResult> {
  try {
    const { data, error } = await authClient.twoFactor.getTotpUri({
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to get TOTP URI",
      };
    }

    return {
      success: true,
      totpURI: data?.totpURI,
    };
  } catch (error) {
    console.error("Get TOTP URI error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Step 3: Verify TOTP code during setup
 * This will set twoFactorEnabled to true
 */
export async function verifySetupTotp(
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
    console.error("Verify setup TOTP error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Generate new backup codes
 * Old codes will be deleted
 */
export async function generateBackupCodes(
  password: string
): Promise<SetupResult> {
  try {
    const { data, error } = await authClient.twoFactor.generateBackupCodes({
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to generate backup codes",
      };
    }

    return {
      success: true,
      backupCodes: data?.backupCodes || [],
    };
  } catch (error) {
    console.error("Generate backup codes error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
