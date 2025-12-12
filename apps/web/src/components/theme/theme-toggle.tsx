"use client";

import { useState, useTransition, useEffect } from "react";
import { actionSetTheme } from "@/lib/actions/settings";
import { getThemeSettings } from "@/lib/server/settings";
import styles from "./theme-toggle.module.css";

type ThemeOption = "light" | "dark";
type DisplayOption = "light" | "dark" | "system";

interface ThemeToggleProps {
  /**
   * If true, only show icons (no text labels)
   * Useful for compact layouts like headers
   */
  iconOnly?: boolean;
}

/**
 * Theme toggle component with three options: Light, Dark, System
 *
 * Simplified approach:
 * - Theme is always actual value (light/dark)
 * - isSystemTheme flag tracks if user wants to follow system preference
 * - When "system" is selected, theme is set to current system preference
 *   and isSystemTheme=true, so ThemeProvider will update on system changes
 */
export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const [isPending, startTransition] = useTransition();

  // Track state locally (server-side cookie is source of truth)
  const [state, setState] = useState<{
    theme: ThemeOption;
    isSystemTheme: boolean;
  }>({ theme: "light", isSystemTheme: true });

  // Fetch initial state from server on mount
  useEffect(() => {
    getThemeSettings().then(setState);
  }, []);

  // Derive display option (what button to highlight)
  const displayOption: DisplayOption = state.isSystemTheme
    ? "system"
    : state.theme;

  const handleThemeChange = (option: DisplayOption) => {
    const htmlEl = document.documentElement;

    if (option === "system") {
      // Follow system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const systemTheme: ThemeOption = prefersDark ? "dark" : "light";

      setState({ theme: systemTheme, isSystemTheme: true });
      htmlEl.setAttribute("data-theme", systemTheme);

      startTransition(async () => {
        const result = await actionSetTheme(systemTheme, true);
        if (!result.success) {
          console.error("Failed to update theme:", result.error);
        }
      });
    } else {
      // Explicit theme choice
      setState({ theme: option, isSystemTheme: false });
      htmlEl.setAttribute("data-theme", option);

      startTransition(async () => {
        const result = await actionSetTheme(option, false);
        if (!result.success) {
          console.error("Failed to update theme:", result.error);
        }
      });
    }
  };

  const containerClass = iconOnly
    ? `${styles.themeToggle} ${styles.iconOnly}`
    : styles.themeToggle;

  return (
    <div className={containerClass} data-current-theme={displayOption}>
      <button
        onClick={() => handleThemeChange("light")}
        disabled={isPending}
        aria-label="Light theme"
        className={`${styles.button} ${displayOption === "light" ? styles.active : ""}`}
        title="Light theme"
      >
        <span aria-hidden="true">☀️</span>
        {!iconOnly && <span className={styles.buttonText}>Light</span>}
      </button>
      <button
        onClick={() => handleThemeChange("dark")}
        disabled={isPending}
        aria-label="Dark theme"
        className={`${styles.button} ${displayOption === "dark" ? styles.active : ""}`}
        title="Dark theme"
      >
        <span aria-hidden="true">🌙</span>
        {!iconOnly && <span className={styles.buttonText}>Dark</span>}
      </button>
      <button
        onClick={() => handleThemeChange("system")}
        disabled={isPending}
        aria-label="System theme"
        className={`${styles.button} ${displayOption === "system" ? styles.active : ""}`}
        title="Follow system preference"
      >
        <span aria-hidden="true">💻</span>
        {!iconOnly && <span className={styles.buttonText}>System</span>}
      </button>
    </div>
  );
}
