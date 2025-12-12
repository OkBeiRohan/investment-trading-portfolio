"use server";

import { cookies } from "next/headers";

export type ThemeOption = "light" | "dark" | "system";

export interface AppSettings {
  theme: ThemeOption;
  language: string; // ISO code, e.g., "en", "hi"
  currency: string; // e.g., "INR", "USD"
  callbackUrl?: string | null;
}

const SETTINGS_COOKIE = "app.settings";

function getDefaultSettings(): AppSettings {
  return {
    theme: "system",
    language: "en",
    currency: "INR",
    callbackUrl: null,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const jar = await cookies();
  const raw = jar.get(SETTINGS_COOKIE)?.value;
  if (!raw) return getDefaultSettings();
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const defaults = getDefaultSettings();
    return {
      theme: (parsed.theme as ThemeOption) ?? defaults.theme,
      language: parsed.language ?? defaults.language,
      currency: parsed.currency ?? defaults.currency,
      callbackUrl: parsed.callbackUrl ?? defaults.callbackUrl,
    };
  } catch {
    return getDefaultSettings();
  }
}

async function writeSettings(settings: AppSettings) {
  const jar = await cookies();
  // Non-sensitive preferences; allow client-side reads (httpOnly: false)
  jar.set(SETTINGS_COOKIE, JSON.stringify(settings), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    // Persist for 180 days
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function setTheme(theme: ThemeOption) {
  const current = await getAppSettings();
  await writeSettings({ ...current, theme });
}

export async function setLanguage(language: string) {
  const current = await getAppSettings();
  await writeSettings({ ...current, language });
}

export async function setCurrency(currency: string) {
  const current = await getAppSettings();
  await writeSettings({ ...current, currency });
}

export async function setCallbackUrl(callbackUrl: string | null) {
  const current = await getAppSettings();
  await writeSettings({ ...current, callbackUrl });
}

export async function clearCallbackUrl() {
  await setCallbackUrl(null);
}

export async function resolveEffectiveTheme(
  theme: ThemeOption
): Promise<"light" | "dark"> {
  if (theme !== "system") return theme;
  // Server-side best-effort: default to light; client can refine based on prefers-color-scheme
  return "light";
}
