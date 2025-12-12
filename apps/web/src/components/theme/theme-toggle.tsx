"use client";

import { useState, useTransition } from "react";
import { actionSetTheme } from "@/lib/actions/settings";
import styles from "./theme-toggle.module.css";

type ThemeOption = "light" | "dark" | "system";

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
 * Updates both the cookie (server-side persistence) and HTML attribute
 * (immediate visual feedback).
 */
export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const [isPending, startTransition] = useTransition();

  // Read initial theme from cookie (lazy initialization)
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(() => {
    if (typeof window === "undefined") return "system";

    const cookie = document.cookie.match(/app\.settings=([^;]+)/)?.[1];
    if (cookie) {
      try {
        const settings = JSON.parse(decodeURIComponent(cookie));
        return settings.theme || "system";
      } catch {
        return "system";
      }
    }
    return "system";
  });

  const handleThemeChange = (theme: ThemeOption) => {
    setCurrentTheme(theme);

    // Update HTML attribute immediately for instant feedback
    const htmlEl = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      htmlEl.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      htmlEl.setAttribute("data-theme", theme);
    }

    // Persist to cookie via server action
    startTransition(async () => {
      const result = await actionSetTheme(theme);
      if (!result.success) {
        // Revert on error
        console.error("Failed to update theme:", result.error);
        // Could show toast notification here
      }
    });
  };

  const containerClass = iconOnly
    ? `${styles.themeToggle} ${styles.iconOnly}`
    : styles.themeToggle;

  return (
    <div className={containerClass} data-current-theme={currentTheme}>
      <button
        onClick={() => handleThemeChange("light")}
        disabled={isPending}
        aria-label="Light theme"
        className={`${styles.button} ${currentTheme === "light" ? styles.active : ""}`}
        title="Light theme"
      >
        <span aria-hidden="true">☀️</span>
        {!iconOnly && <span className={styles.buttonText}>Light</span>}
      </button>
      <button
        onClick={() => handleThemeChange("dark")}
        disabled={isPending}
        aria-label="Dark theme"
        className={`${styles.button} ${currentTheme === "dark" ? styles.active : ""}`}
        title="Dark theme"
      >
        <span aria-hidden="true">🌙</span>
        {!iconOnly && <span className={styles.buttonText}>Dark</span>}
      </button>
      <button
        onClick={() => handleThemeChange("system")}
        disabled={isPending}
        aria-label="System theme"
        className={`${styles.button} ${currentTheme === "system" ? styles.active : ""}`}
        title="Follow system preference"
      >
        <span aria-hidden="true">💻</span>
        {!iconOnly && <span className={styles.buttonText}>System</span>}
      </button>
    </div>
  );
}
