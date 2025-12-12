"use server";

import {
  setTheme,
  setLanguage,
  setCurrency,
  clearCallbackUrl,
} from "@/lib/server/settings";

export async function actionSetTheme(theme: "light" | "dark" | "system") {
  setTheme(theme);
  return { success: true } as const;
}

export async function actionSetLanguage(language: string) {
  setLanguage(language);
  return { success: true } as const;
}

export async function actionSetCurrency(currency: string) {
  setCurrency(currency);
  return { success: true } as const;
}

export async function actionClearCallback() {
  clearCallbackUrl();
  return { success: true } as const;
}
