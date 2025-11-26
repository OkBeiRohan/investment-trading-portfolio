"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { AuthClient } from "@repo/authentication/client";

/**
 * Main Authentication Hook
 * Uses Better Auth's built-in session management
 */
export function useAuth(): {
  client: AuthClient;
  signOut: () => Promise<void>;
} {
  const router = useRouter();

  const signOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return {
    client: authClient,
    signOut,
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
