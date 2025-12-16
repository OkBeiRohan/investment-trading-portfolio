"use server";

import { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Sign out user (server action)
 * Deletes session cookie and redirects to login
 */
export async function signOutAction() {
  const cookieStore = await cookies();

  // Delete all possible cookie names (both token and data)
  cookieStore.delete("__Secure-better-auth.session_token");
  cookieStore.delete("better-auth.session_token");
  cookieStore.delete("__Secure-better-auth.session_data");
  cookieStore.delete("better-auth.session_data");

  redirect("/authentication/login");
}

/**
 * Get session status (server action)
 * Returns session data if valid cookie exists
 */
export async function isAuthenticatedAction(reqCookies?: RequestCookies) {
  const cookieStore = reqCookies ?? (await cookies());

  // Check for session_token (primary indicator)
  const secureToken = cookieStore.get("__Secure-better-auth.session_token");
  const regularToken = cookieStore.get("better-auth.session_token");
  const token = secureToken?.value || regularToken?.value;

  if (!token) {
    return false;
  }

  return true;
}
