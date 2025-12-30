"use client";

import { authClient } from "@/lib/auth/auth-client";

export interface TwoFactorStatus {
  enabled: boolean;
  hasCredentials: boolean;
}

/**
 * Get current 2FA status for the user
 */
export async function get2FAStatus(): Promise<TwoFactorStatus> {
  try {
    const session = await authClient.getSession();

    if (!session.data) {
      return {
        enabled: false,
        hasCredentials: false,
      };
    }

    const user = session.data.user;

    // Check if user has 2FA enabled
    // Note: This is only true AFTER user has verified their TOTP code
    const twoFactorEnabled = user.twoFactorEnabled || false;

    // Check if user has password set (credentials)
    // User must have credentials to enable 2FA
    const hasCredentials = !!user.email && user.emailVerified !== null;

    return {
      enabled: twoFactorEnabled,
      hasCredentials,
    };
  } catch (error) {
    console.error("Get 2FA status error:", error);
    return {
      enabled: false,
      hasCredentials: false,
    };
  }
}
