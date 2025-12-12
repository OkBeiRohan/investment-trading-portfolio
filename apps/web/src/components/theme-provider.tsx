"use client";

import { useEffect } from "react";

/**
 * Client-side theme provider that handles system preference detection
 * and theme transitions.
 *
 * Resolves "system" theme to actual user preference (light/dark).
 * Listens for system preference changes and updates theme accordingly.
 *
 * The HTML data-theme attribute is set server-side in layout.tsx.
 * This component refines it on the client side if theme is "system".
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const htmlEl = document.documentElement;

    // Function to apply system preference
    const applySystemPreference = () => {
      const currentTheme = htmlEl.getAttribute("data-theme");

      // Only apply if explicitly "system" or not set
      if (currentTheme !== "system") return;

      // Detect system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const effectiveTheme = prefersDark ? "dark" : "light";

      htmlEl.setAttribute("data-theme", effectiveTheme);
    };

    // Apply on mount
    applySystemPreference();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const currentTheme = htmlEl.getAttribute("data-theme");

      // Check if user has explicit preference (stored in cookie)
      // If data-theme is "light" or "dark" explicitly, respect it
      // Only react to system changes if theme is still "system"
      const cookie = document.cookie.match(/app\.settings=([^;]+)/)?.[1];
      if (cookie) {
        try {
          const settings = JSON.parse(decodeURIComponent(cookie));
          if (settings.theme === "system") {
            htmlEl.setAttribute("data-theme", e.matches ? "dark" : "light");
          }
        } catch {
          // If cookie parsing fails, fallback to current theme
          if (currentTheme === "system" || !currentTheme) {
            htmlEl.setAttribute("data-theme", e.matches ? "dark" : "light");
          }
        }
      } else {
        // No cookie, assume system preference
        htmlEl.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return <>{children}</>;
}
