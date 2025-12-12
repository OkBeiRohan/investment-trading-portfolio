/**
 * Account Data Access Layer
 *
 * User profile and account-related data access functions.
 */

import { withAuth, getUser } from "../dal";
import { trpc } from "@/lib/trpc/server";

/**
 * Get current user's profile
 *
 * @returns {Promise<UserProfile>}
 */
export async function getUserProfile() {
  return withAuth(async () => {
    const user = await getUser();

    return trpc.account.getProfile.query({
      userId: user.id,
    });
  });
}

/**
 * Get linked accounts (brokerage, banking, crypto exchanges)
 *
 * @returns {Promise<LinkedAccount[]>}
 */
export async function getLinkedAccounts() {
  return withAuth(async () => {
    const user = await getUser();

    return trpc.account.getLinkedAccounts.query({
      userId: user.id,
    });
  });
}

/**
 * Get security settings (2FA, sessions, API tokens)
 *
 * @returns {Promise<SecuritySettings>}
 */
export async function getSecuritySettings() {
  return withAuth(async () => {
    const user = await getUser();

    return trpc.account.getSecuritySettings.query({
      userId: user.id,
    });
  });
}

/**
 * Get active sessions
 *
 * @returns {Promise<Session[]>}
 */
export async function getActiveSessions() {
  return withAuth(async () => {
    const user = await getUser();

    return trpc.account.getSessions.query({
      userId: user.id,
    });
  });
}

/**
 * Get notification preferences
 *
 * @returns {Promise<NotificationPreferences>}
 */
export async function getNotificationPreferences() {
  return withAuth(async () => {
    const user = await getUser();

    return trpc.account.getNotificationPreferences.query({
      userId: user.id,
    });
  });
}
