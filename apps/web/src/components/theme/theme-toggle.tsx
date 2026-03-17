"use client";

import { useState, useTransition, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { actionSetTheme } from "@/lib/actions/settings";
import { getThemeSettings } from "@/lib/server/settings";
import styles from "./theme-toggle.module.css";

type ThemeOption = "light" | "dark";
type DisplayOption = "light" | "dark" | "system";

interface ThemeToggleProps {
  iconOnly?: boolean;
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<{
    theme: ThemeOption;
    isSystemTheme: boolean;
  }>({ theme: "light", isSystemTheme: true });

  useEffect(() => {
    getThemeSettings().then(setState);
  }, []);

  const displayOption: DisplayOption = state.isSystemTheme
    ? "system"
    : state.theme;

  const handleThemeChange = (option: DisplayOption) => {
    const htmlEl = document.documentElement;

    if (option === "system") {
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
        <Sun size={14} strokeWidth={2} />
        {!iconOnly && <span className={styles.buttonText}>Light</span>}
      </button>
      <button
        onClick={() => handleThemeChange("dark")}
        disabled={isPending}
        aria-label="Dark theme"
        className={`${styles.button} ${displayOption === "dark" ? styles.active : ""}`}
        title="Dark theme"
      >
        <Moon size={14} strokeWidth={2} />
        {!iconOnly && <span className={styles.buttonText}>Dark</span>}
      </button>
      <button
        onClick={() => handleThemeChange("system")}
        disabled={isPending}
        aria-label="System theme"
        className={`${styles.button} ${displayOption === "system" ? styles.active : ""}`}
        title="Follow system preference"
      >
        <Monitor size={14} strokeWidth={2} />
        {!iconOnly && <span className={styles.buttonText}>Auto</span>}
      </button>
    </div>
  );
}
