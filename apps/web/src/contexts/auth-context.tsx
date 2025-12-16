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
import { useRouter } from "next/navigation";
import { Route } from "next";
import { isAuthenticatedAction, signOutAction } from "@/lib/auth/actions";

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
  const router = useRouter();

  const fetchSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First try server action to verify cookie exists and is valid
      const serverSession = await isAuthenticatedAction();

      if (!serverSession) {
        setUser(null);
        if (redirectOnUnauthenticated && typeof window !== "undefined") {
          router.push(redirectOnUnauthenticated as Route);
        }
        return;
      }

      // Cookie exists and is valid, now get full session from client
      const response = await authClient.getSession({
        fetchOptions: {
          credentials: "include",
        },
      });

      if (response.data) {
        setUser(response.data.user);
      } else {
        // Session failed client-side but cookie exists - invalid session
        // Sign out to clear invalid cookie
        await signOutAction();
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
      setError(err as Error);
      setUser(null);

      // If session fetch fails, sign out to clear any invalid cookies
      try {
        await signOutAction();
        router.refresh();
      } catch (signOutErr) {
        console.error("Failed to sign out after session error:", signOutErr);
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch session on mount (only once)
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signOut = useCallback(async () => {
    try {
      // First sign out on client (calls backend)
      await authClient.signOut({
        fetchOptions: {
          credentials: "include",
        },
      });

      setUser(null);

      // Then use server action to ensure cookie is deleted
      await signOutAction();
    } catch (err) {
      console.error("Failed to sign out:", err);
      setError(err as Error);

      // Even if client sign out fails, try server action
      try {
        await signOutAction();
      } catch (serverErr) {
        console.error("Failed server sign out:", serverErr);
      }
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
