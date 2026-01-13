"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { signOutAction } from "@/lib/auth/actions";
import { usePathname } from "next/navigation";
import publicPaths from "@/lib/auth/PUBLIC_PATHS";

/**
 * AuthVerifier component
 *
 * Verifies user authentication status on mount
 * If not authenticated, triggers sign out action
 */
export default function AuthVerifier() {
  const { data, isPending, isRefetching } = authClient.useSession();
  const pathname = usePathname();

  async function signOut() {
    await signOutAction();
  }

  // Fetch session on mount (only once)
  useEffect(() => {
    if (
      !data &&
      !isPending &&
      !isRefetching &&
      !publicPaths.some((publicPath) => pathname.startsWith(publicPath))
    ) {
      signOut();
    }
  }, [data, isPending, isRefetching, pathname]);

  return null;
}
