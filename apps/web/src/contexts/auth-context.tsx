"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth/auth-client";
import type { IUser } from "@repo/schema";

export interface AuthContextValue {
  user: IUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
  redirectOnUnauthenticated?: string;
}

/**
 * AuthProvider Component
 *
 * Provides authentication state to the entire application.
 * Should be mounted once at the root level in app/layout.tsx or app/providers.tsx.
 *
 * This ensures:
 * - Single session fetch on app load
 * - Shared auth state across all components
 * - No redundant API calls
 */
export function AuthProvider({
  children,
  redirectOnUnauthenticated,
}: AuthProviderProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authClient.getSession({
        fetchOptions: {
          credentials: "include",
        },
      });

      if (response.data) {
        setUser(response.data.user);
      } else {
        setUser(null);
        if (redirectOnUnauthenticated && typeof window !== "undefined") {
          window.location.href = redirectOnUnauthenticated;
        }
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setError(err as Error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [redirectOnUnauthenticated]);

  // Fetch session on mount (only once)
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          credentials: "include",
        },
      });
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/sign-in";
      }
    } catch (err) {
      console.error("Failed to sign out:", err);
      setError(err as Error);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch: fetchSession,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
