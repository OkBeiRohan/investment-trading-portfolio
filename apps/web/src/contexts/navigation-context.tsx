"use client";

import { createContext, useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: Route;
}

export interface SubNavigationItem {
  id: string;
  label: string;
  route: Route;
}

export interface NavigationItem {
  id: string;
  label: string;
  route: Route;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  subItems?: SubNavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface NavigationState {
  /** Page title shown in header */
  title: string;
  /** Breadcrumb trail */
  breadcrumbs: Breadcrumb[];
  /** Navigation sections */
  sections: NavigationSection[];
  /** Currently active section ID */
  activeSection: string | null;
  /** Currently active item ID */
  activeItem: NavigationItem | null;
  /** Optional actions for header */
  headerActions?: React.ReactNode;
}

export interface NavigationContextValue extends NavigationState {
  /** Update full navigation state */
  setNavigation: (state: Partial<NavigationState>) => void;
  /** Update just the title */
  setTitle: (title: string) => void;
  /** Update just the breadcrumbs */
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  /** Update header actions */
  setHeaderActions: (actions: React.ReactNode) => void;
  /** Clear all navigation state */
  clearNavigation: () => void;
}

export const NavigationContext = createContext<
  NavigationContextValue | undefined
>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  defaultSections: NavigationSection[];
}

/**
 * NavigationProvider Component
 *
 * Provides unified navigation state management for the entire app.
 * Handles dynamic updates to header (title, breadcrumbs, actions) and
 * sidebar (sections with collapsible sub-navigation).
 *
 * Usage:
 * ```tsx
 * // In page/layout component
 * const { setNavigation } = useNavigation();
 *
 * useEffect(() => {
 *   setNavigation({
 *     title: "Wealth Overview",
 *     breadcrumbs: [
 *       { label: "Home", href: "/" },
 *       { label: "Wealth" }
 *     ],
 *     activeSection: "wealth",
 *   });
 * }, []);
 * ```
 */
export function NavigationProvider({
  children,
  defaultSections,
}: NavigationProviderProps) {
  const pathname = usePathname();

  const [state, setState] = useState<
    Omit<NavigationState, "activeSection" | "activeItem">
  >({
    title: "",
    breadcrumbs: [],
    sections: defaultSections,
    headerActions: undefined,
  });

  // Compute active section and item based on pathname (no state, pure computation)
  const getActiveNavigation = useCallback(() => {
    let foundActiveSection: string | null = null;
    let foundActiveItem: NavigationItem | null = null;

    for (const section of defaultSections) {
      for (const item of section.items) {
        if (pathname === item.route || pathname.startsWith(item.route + "/")) {
          foundActiveSection = section.id;
          foundActiveItem = item;
          break;
        }
        if (item.subItems) {
          for (const subItem of item.subItems) {
            if (pathname === subItem.route) {
              foundActiveSection = section.id;
              foundActiveItem = item;
              break;
            }
          }
        }
      }
      if (foundActiveSection) break;
    }

    return { activeSection: foundActiveSection, activeItem: foundActiveItem };
  }, [pathname, defaultSections]);

  const activeNavigation = getActiveNavigation();

  const setNavigation = useCallback((updates: Partial<NavigationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setTitle = useCallback((title: string) => {
    setState((prev) => ({ ...prev, title }));
  }, []);

  const setBreadcrumbs = useCallback((breadcrumbs: Breadcrumb[]) => {
    setState((prev) => ({ ...prev, breadcrumbs }));
  }, []);

  const setHeaderActions = useCallback((headerActions: React.ReactNode) => {
    setState((prev) => ({ ...prev, headerActions }));
  }, []);

  const clearNavigation = useCallback(() => {
    setState({
      title: "",
      breadcrumbs: [],
      sections: defaultSections,
      headerActions: undefined,
    });
  }, [defaultSections]);

  const value: NavigationContextValue = {
    ...state,
    ...activeNavigation,
    setNavigation,
    setTitle,
    setBreadcrumbs,
    setHeaderActions,
    clearNavigation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}
