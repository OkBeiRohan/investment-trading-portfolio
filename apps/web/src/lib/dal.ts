/**
 * Data Access Layer (DAL)
 *
 * This module provides secure data access patterns for Server Components and Server Actions.
 * It ensures that all data access is properly authenticated and authorized before execution.
 *
 * Reference: https://nextjs.org/blog/security-nextjs-server-components-actions
 *
 * Key Principles:
 * 1. Always verify session before data access
 * 2. Scope all queries to the authenticated user's organization
 * 3. Check permissions for sensitive operations
 * 4. Never trust client-provided IDs without verification
 * 5. Use this layer as a gatekeeper for all backend data operations
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

/**
 * Verify and return the current user session
 * Cached per request to avoid multiple session lookups
 *
 * The authClient connects to the NestJS API backend (/api/auth/*) which handles
 * all authentication logic via Better Auth.
 *
 * @throws {Error} Redirects to login if not authenticated
 * @returns {Promise<Session>} The authenticated session
 */
export const verifySession = cache(async () => {
  // Get session from Better Auth backend (NestJS API)
  // The authClient is configured to use /api/auth which is proxied to the NestJS backend
  const session = await authClient.getSession({
    fetchOptions: {
      // Ensure cookies are sent to the backend for authentication
      credentials: "include",
    },
  });

  if (!session?.data) {
    redirect("/authentication/login");
  }

  return {
    isAuth: true,
    userId: session.data.user.id,
    user: session.data.user,
    session: session.data.session,
  };
});

/**
 * Get the current user's data
 * Always use this instead of direct user queries
 *
 * @returns {Promise<User>} The authenticated user
 */
export const getUser = cache(async () => {
  const session = await verifySession();
  return session.user;
});

/**
 * Get the current user's active organization
 * All data queries should be scoped to this organization
 *
 * The active organization is stored in the session and managed by Better Auth.
 * Users can switch active organizations using the organization plugin.
 *
 * @returns {Promise<{organizationId: string, role: string}>}
 */
export const getUserOrganization = cache(async () => {
  const session = await verifySession();

  // Get active organization ID from session
  const activeOrgId = session.session.activeOrganizationId;

  if (!activeOrgId) {
    throw new Error("No active organization found");
  }

  // Fetch full organization details to get user's role
  // The getFullOrganization returns org details with members array
  const orgDetails = await authClient.organization.getFullOrganization({
    query: { organizationId: activeOrgId },
  });

  if (!orgDetails?.data) {
    throw new Error("Failed to fetch organization details");
  }

  // Find the current user's membership to get their role
  const currentUserId = session.userId;

  // The organization data includes members array with role information
  type OrgWithMembers = typeof orgDetails.data & {
    members?: Array<{ userId: string; role: "owner" | "admin" | "member" }>;
  };

  const membership = (orgDetails.data as OrgWithMembers).members?.find(
    (m) => m.userId === currentUserId
  );

  const userRole = membership?.role || "member";

  return {
    organizationId: activeOrgId,
    role: userRole,
  };
});

/**
 * Check if user has specific permission in current organization
 * Use this before performing sensitive operations
 *
 * @param {string} permission - Permission to check (e.g., "trade.executeStrategies")
 * @returns {Promise<boolean>}
 */
export const hasPermission = cache(
  async (permission: string): Promise<boolean> => {
    const { role } = await getUserOrganization();

    // TODO: Implement actual permission checking logic via backend API
    // This should query the RBAC system to verify permissions

    // For now, simple role-based check
    // Owner has all permissions
    if (role === "owner") {
      return true;
    }

    // Admin has most permissions except certain owner-only operations
    if (role === "admin") {
      const adminPermissions = ["admin.", "trade.", "wealth.", "organization."];
      return adminPermissions.some((p) =>
        permission.startsWith(p.replace(".*", ""))
      );
    }

    // Member has limited view-only permissions
    const memberPermissions = ["trade.view", "wealth.view"];
    return memberPermissions.includes(permission);
  }
);

/**
 * Assert that user has required permission, throw if not
 * Use this at the start of Server Actions that require specific permissions
 *
 * @param {string} permission - Required permission
 * @throws {Error} If user lacks permission
 */
export async function assertPermission(permission: string): Promise<void> {
  const canPerform = await hasPermission(permission);

  if (!canPerform) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Verify that a resource belongs to the current user's organization
 * Use this before querying/mutating organization-scoped resources
 *
 * @param {string} resourceOrgId - Organization ID of the resource
 * @throws {Error} If resource doesn't belong to user's organization
 */
export async function assertResourceOwnership(
  resourceOrgId: string
): Promise<void> {
  const { organizationId } = await getUserOrganization();

  if (resourceOrgId !== organizationId) {
    throw new Error(
      "Access denied: Resource belongs to different organization"
    );
  }
}

/**
 * Type-safe wrapper for data fetching with automatic session verification
 * Use this as a base for all data fetching functions
 *
 * @template T - Return type of the data fetcher
 * @param {Function} fetcher - Async function that fetches data
 * @returns {Promise<T>} The fetched data
 */
export async function withAuth<T>(
  fetcher: (session: Awaited<ReturnType<typeof verifySession>>) => Promise<T>
): Promise<T> {
  const session = await verifySession();
  return fetcher(session);
}

/**
 * Type-safe wrapper for data mutations with automatic session and permission verification
 * Use this for all Server Actions that mutate data
 *
 * @template T - Return type of the mutator
 * @param {string} permission - Required permission
 * @param {Function} mutator - Async function that mutates data
 * @returns {Promise<T>} The mutation result
 */
export async function withPermission<T>(
  permission: string,
  mutator: (session: Awaited<ReturnType<typeof verifySession>>) => Promise<T>
): Promise<T> {
  const session = await verifySession();
  await assertPermission(permission);
  return mutator(session);
}
