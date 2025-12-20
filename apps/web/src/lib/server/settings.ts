"use server";

import { cookies } from "next/headers";
import {
  type AppSettings,
  type ThemeOption,
  type LanguageCode,
  type CurrencyCode,
  AppSettingsSchema,
  getDefaultAppSettings,
} from "@repo/schema";

const SETTINGS_COOKIE = "app.settings";
const CALLBACK_COOKIE = "app.callbackUrl"; // Separate httpOnly cookie from proxy
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

/**
 * Safely parse and validate settings from cookie
 * Returns default settings if parsing/validation fails
 */
function parseAndValidateSettings(raw: string): AppSettings {
  try {
    const parsed = JSON.parse(raw);
    const result = AppSettingsSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    // If validation fails, log warning and return defaults
    console.warn("Invalid settings in cookie:", result.error.format());
    return getDefaultAppSettings();
  } catch (error) {
    console.warn("Failed to parse settings cookie:", error);
    return getDefaultAppSettings();
  }
}

/**
 * Get application settings from cookie with validation
 * Always returns valid settings (defaults if cookie invalid/missing)
 *
 * Note: callbackUrl is stored separately, use getCallbackUrl() to retrieve it
 */
export async function getAppSettings(): Promise<AppSettings> {
  const jar = await cookies();
  const raw = jar.get(SETTINGS_COOKIE)?.value;

  if (!raw) {
    return getDefaultAppSettings();
  }

  return parseAndValidateSettings(raw);
}

/**
 * Write settings to cookie (internal use only)
 * Settings are already validated by this point
 */
async function writeSettings(settings: AppSettings): Promise<void> {
  const jar = await cookies();

  // Double-check validation before writing
  const validated = AppSettingsSchema.parse(settings);

  jar.set(SETTINGS_COOKIE, JSON.stringify(validated), {
    path: "/",
    sameSite: "lax",
    httpOnly: true, // Security: Prevent client-side access
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Update theme preference
 * Validates input and updates cookie
 *
 * When user explicitly selects light/dark:
 * - Sets theme to that value
 * - Sets isSystemTheme to false
 *
 * When user enables "follow system":
 * - Sets theme to current system preference (detected by client)
 * - Sets isSystemTheme to true
 * - Client will update theme when system preference changes
 */
export async function setTheme(
  theme: ThemeOption,
  isSystemTheme: boolean = false
): Promise<void> {
  const current = await getAppSettings();
  await writeSettings({ ...current, theme, isSystemTheme });
}

/**
 * Update language preference
 * Validates input and updates cookie
 */
export async function setLanguage(language: LanguageCode): Promise<void> {
  const current = await getAppSettings();
  await writeSettings({ ...current, language });
}

/**
 * Update currency preference
 * Validates input and updates cookie
 */
export async function setCurrency(currency: CurrencyCode): Promise<void> {
  const current = await getAppSettings();
  await writeSettings({ ...current, currency });
}

/**
 * Get callback URL from proxy cookie
 * Returns null if not set or expired
 */
export async function getCallbackUrl(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CALLBACK_COOKIE)?.value ?? null;
}

/**
 * Clear callback URL (typically after successful redirect)
 * Deletes proxy cookie set during auth redirect
 */
export async function clearCallbackUrl(): Promise<void> {
  const jar = await cookies();
  jar.delete(CALLBACK_COOKIE);
}

/**
 * Get theme settings for client-side theme detection
 * Returns only theme-related data (not sensitive settings)
 */
export async function getThemeSettings(): Promise<{
  theme: ThemeOption;
  isSystemTheme: boolean;
}> {
  const settings = await getAppSettings();
  return {
    theme: settings.theme,
    isSystemTheme: settings.isSystemTheme,
  };
}

/**
 * Re-export types for convenience
 */
export type { AppSettings, ThemeOption, LanguageCode, CurrencyCode };
