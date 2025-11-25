"use client";

import { useAuth as useBetterAuth } from "@repo/authentication/client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Main Authentication Hook
 *
 * Provides access to current user, session, and auth actions.
 * Automatically handles redirects and cache invalidation.
 */
export function useAuth() {
  const router = useRouter();

  const { session, user, isLoading, isAuthenticated, error, refetch } =
    useBetterAuth({
      authClient,
      redirectOnUnauthenticated: "/sign-in",
    });

  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh(); // Clear Next.js cache
  };

  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    error,
    refetch,
    signOut,
  };
}
