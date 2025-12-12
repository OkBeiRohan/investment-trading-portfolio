"use client";

import { useEffect, useState } from "react";
import { actionSetTheme } from "@/lib/actions/settings";
import { getThemeSettings } from "@/lib/server/settings";

/**
 * Client-side theme provider that handles system preference detection
 * and automatic theme switching when isSystemTheme=true.
 *
 * Security: Uses httpOnly cookies accessed only via server functions.
 * No client-side cookie parsing - prevents XSS attacks.
 *
 * Behavior:
 * - On mount: Fetch theme settings from server
 *   - If isSystemTheme=true and mismatch with system: Update cookie
 * - On system preference change: If isSystemTheme=true, update cookie
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isSystemTheme, setIsSystemTheme] = useState<boolean | null>(null);

  useEffect(() => {
    const htmlEl = document.documentElement;

    // Detect system preference
    const getSystemTheme = (): "light" | "dark" => {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    // Sync theme with system on mount
    const syncThemeWithSystem = async () => {
      // Fetch settings from server (httpOnly cookie)
      const settings = await getThemeSettings();
      setIsSystemTheme(settings.isSystemTheme);

      if (!settings.isSystemTheme) return;

      const systemTheme = getSystemTheme();
      const currentTheme = settings.theme;

      // Only update if mismatch
      if (systemTheme !== currentTheme) {
        htmlEl.setAttribute("data-theme", systemTheme);
        await actionSetTheme(systemTheme, true);
      }
    };

    syncThemeWithSystem();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = async (e: MediaQueryListEvent) => {
      // Only react if user follows system preference
      if (isSystemTheme === false) return;

      // Re-fetch to ensure we have latest state
      const settings = await getThemeSettings();
      if (!settings.isSystemTheme) return;

      const newTheme = e.matches ? "dark" : "light";
      htmlEl.setAttribute("data-theme", newTheme);
      await actionSetTheme(newTheme, true);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [isSystemTheme]);

  return <>{children}</>;
}
