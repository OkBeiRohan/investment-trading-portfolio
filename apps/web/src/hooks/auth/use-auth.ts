"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Main Authentication Hook
 * Uses Better Auth's built-in session management
 */
export function useAuth() {
  const router = useRouter();

  const signOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return {
    // client: authClient,
    signOut,
    // Expose all Better Auth methods
  };
}

/**
 * Get session on server components
 * Use this in Server Components
 */
export async function getServerSession() {
  const { headers } = await import("next/headers");
  const headersList = await headers();

  return authClient.getSession({
    fetchOptions: {
      headers: headersList,
    },
  });
}
