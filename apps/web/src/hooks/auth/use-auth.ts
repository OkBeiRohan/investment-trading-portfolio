"use client";

import { AuthContext, AuthContextValue } from "@/contexts/auth-context";
import { useContext } from "react";

/**
 * useAuth Hook
 *
 * Access authentication state from any Client Component.
 * Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { user, isLoading, signOut } = useAuth();
 *
 *   if (isLoading) return <Loading />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
