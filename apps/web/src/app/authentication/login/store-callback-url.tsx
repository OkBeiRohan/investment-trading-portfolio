"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Client component to store callback URL in sessionStorage
 * This runs when the login page loads with a callbackUrl query parameter
 */
export function StoreCallbackUrl() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl");

    if (callbackUrl) {
      // Store in sessionStorage for use after successful authentication
      sessionStorage.setItem("auth.callbackUrl", callbackUrl);
    }
  }, [searchParams]);

  return null;
}
