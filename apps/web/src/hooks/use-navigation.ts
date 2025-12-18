"use client";

import { useContext } from "react";
import {
  NavigationContext,
  type NavigationContextValue,
} from "@/contexts/navigation-context";

/**
 * Hook to access navigation context
 *
 * Returns default values when used outside provider (for development)
 *
 * @example
 * ```tsx
 * const { setNavigation, title, breadcrumbs } = useNavigation();
 *
 * useEffect(() => {
 *   setNavigation({
 *     title: "Wealth Overview",
 *     breadcrumbs: [
 *       { label: "Home", href: "/" },
 *       { label: "Wealth" }
 *     ]
 *   });
 * }, []);
 * ```
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);

  if (!context) {
    // Return default values when used outside provider (for development)
    return {
      title: "",
      breadcrumbs: [],
      sections: [],
      activeSection: null,
      activeItem: null,
      headerActions: undefined,
      setNavigation: () => {},
      setTitle: () => {},
      setBreadcrumbs: () => {},
      setHeaderActions: () => {},
      clearNavigation: () => {},
    };
  }

  return context;
}
