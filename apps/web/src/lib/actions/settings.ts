"use server";

import {
  setTheme,
  setLanguage,
  setCurrency,
  clearCallbackUrl,
} from "@/lib/server/settings";
import {
  SetThemeInputSchema,
  SetLanguageInputSchema,
  SetCurrencyInputSchema,
  type ThemeOption,
  type LanguageCode,
  type CurrencyCode,
} from "@repo/schema";
import { revalidatePath } from "next/cache";

/**
 * Standard server action response
 */
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Update theme preference with validation
 * Revalidates layout to apply new theme
 */
export async function actionSetTheme(
  theme: ThemeOption,
  isSystemTheme: boolean = false
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = SetThemeInputSchema.parse({ theme, isSystemTheme });

    // Update settings
    await setTheme(validated.theme, validated.isSystemTheme);

    // Revalidate layout to apply new theme server-side
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Failed to set theme:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update theme",
    };
  }
}

/**
 * Update language preference with validation
 * Revalidates layout to apply new language
 */
export async function actionSetLanguage(
  language: LanguageCode
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = SetLanguageInputSchema.parse({ language });

    // Update settings
    await setLanguage(validated.language);

    // Revalidate layout to apply new language
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("Failed to set language:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update language",
    };
  }
}

/**
 * Update currency preference with validation
 */
export async function actionSetCurrency(
  currency: CurrencyCode
): Promise<ActionResult> {
  try {
    // Validate input
    const validated = SetCurrencyInputSchema.parse({ currency });

    // Update settings
    await setCurrency(validated.currency);

    return { success: true };
  } catch (error) {
    console.error("Failed to set currency:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update currency",
    };
  }
}

/**
 * Clear callback URL after successful redirect
 */
export async function actionClearCallback(): Promise<ActionResult> {
  try {
    await clearCallbackUrl();
    return { success: true };
  } catch (error) {
    console.error("Failed to clear callback:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to clear callback",
    };
  }
}
