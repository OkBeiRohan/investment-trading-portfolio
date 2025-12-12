import { z } from "zod";

/**
 * Theme options for the application
 * Always resolves to actual theme (light or dark)
 */
export const ThemeOptionSchema = z.enum(["light", "dark"]);
export type ThemeOption = z.infer<typeof ThemeOptionSchema>;

/**
 * ISO 639-1 language codes (subset of commonly supported languages)
 * Extend this list as you add more language support
 */
export const LanguageCodeSchema = z.enum([
  "en", // English
  "hi", // Hindi
  "es", // Spanish
  "fr", // French
  "de", // German
  "ja", // Japanese
  "zh", // Chinese
  "ar", // Arabic
  "pt", // Portuguese
  "ru", // Russian
]);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

/**
 * ISO 4217 currency codes (subset of commonly used currencies)
 * Extend this list as you add more currency support
 */
export const CurrencyCodeSchema = z.enum([
  "INR", // Indian Rupee
  "USD", // US Dollar
  "EUR", // Euro
  "GBP", // British Pound
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
  "AUD", // Australian Dollar
  "CAD", // Canadian Dollar
  "CHF", // Swiss Franc
  "SGD", // Singapore Dollar
]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Callback URL validation
 * - Must start with / (relative path)
 * - Cannot contain protocol (prevent open redirect)
 * - Max 500 characters
 * - Cannot contain control characters or null bytes
 */
export const CallbackUrlSchema = z
  .string()
  .regex(
    /^\/[^\x00-\x1F]*$/,
    "Callback URL must be a relative path starting with /"
  )
  .max(500, "Callback URL too long")
  .nullable()
  .optional();

/**
 * Application settings schema with comprehensive validation
 */
export const AppSettingsSchema = z.object({
  theme: ThemeOptionSchema.default("light"),
  isSystemTheme: z.boolean().default(true),
  language: LanguageCodeSchema.default("en"),
  currency: CurrencyCodeSchema.default("INR"),
  callbackUrl: CallbackUrlSchema.default(null),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

/**
 * Partial settings for updates (all fields optional)
 */
export const PartialAppSettingsSchema = AppSettingsSchema.partial();
export type PartialAppSettings = z.infer<typeof PartialAppSettingsSchema>;

/**
 * Server action input schemas for settings updates
 */
export const SetThemeInputSchema = z.object({
  theme: ThemeOptionSchema,
  isSystemTheme: z.boolean(),
});

export const SetLanguageInputSchema = z.object({
  language: LanguageCodeSchema,
});

export const SetCurrencyInputSchema = z.object({
  currency: CurrencyCodeSchema,
});

export const SetCallbackUrlInputSchema = z.object({
  callbackUrl: CallbackUrlSchema,
});

/**
 * Default settings factory
 */
export function getDefaultAppSettings(): AppSettings {
  return {
    theme: "light",
    isSystemTheme: true,
    language: "en",
    currency: "INR",
    callbackUrl: null,
  };
}
