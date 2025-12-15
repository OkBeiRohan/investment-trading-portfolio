"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { cookies } from "next/headers";
import { CallbackUrlSchema } from "@repo/schema";

/**
 * Handle successful authentication
 * - Retrieves callback URL from cookie (set by middleware)
 * - Clears the callback URL cookie
 * - Performs full HTML redirect (causes session refetch in providers)
 * - Falls back to "/" if no valid callback URL exists
 */
export async function handleAuthSuccess(): Promise<never> {
  const cookieStore = await cookies();

  // Get callback URL from cookie
  const callbackUrl = cookieStore.get("app.callbackUrl")?.value;

  // Clear the callback URL cookie
  cookieStore.delete("app.callbackUrl");

  // Validate and redirect
  if (callbackUrl) {
    const validationResult = CallbackUrlSchema.safeParse(callbackUrl);
    if (validationResult.success && validationResult.data) {
      // Full redirect causes browser to refetch everything,
      // including session data in providers
      // Type assertion needed for Next.js typed routes
      redirect(validationResult.data as Route);
    }
  }

  // Default redirect to home
  redirect("/");
}
