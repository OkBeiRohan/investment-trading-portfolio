"use server";

import { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Sign out user (server action)
 * Deletes session cookie and redirects to login
 */
export async function signOutAction() {
  redirect("/authentication/login");
}

/**
 * Get session status (server action)
 * Returns session data if valid cookie exists
 */
export async function isAuthenticatedAction(reqCookies?: RequestCookies) {
  const cookieStore = reqCookies ?? (await cookies());
  const cookiePrefix = process.env.APP_NAME || "better-auth";

  // Check for session_token (primary indicator)
  const secureToken = cookieStore.get(`__Secure-${cookiePrefix}.session_token`);
  const regularToken = cookieStore.get(`${cookiePrefix}.session_token`);
  const token = secureToken?.value || regularToken?.value;

  if (!token) {
    return false;
  }

  return true;
}
