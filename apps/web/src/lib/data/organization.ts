/**
 * Organization Data Access Layer
 *
 * Organization and team management data access.
 */

import { withAuth, withPermission, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";

/**
 * Get all organizations the user is a member of
 *
 * @returns {Promise<Organization[]>}
 */
export async function getUserOrganizations() {
  return withAuth(async (session) => {
    return trpc.organization.getAll.query({
      userId: session.userId,
    });
  });
}

/**
 * Get current organization details
 *
 * @returns {Promise<Organization>}
 */
export async function getCurrentOrganization() {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.organization.get.query({
      organizationId,
    });
  });
}

/**
 * Get teams in current organization
 * Requires organization.viewTeams permission
 *
 * @returns {Promise<Team[]>}
 */
export async function getOrganizationTeams() {
  return withPermission("organization.viewTeams", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.organization.getTeams.query({
      organizationId,
    });
  });
}

/**
 * Get members of current organization
 * Requires organization.viewMembers permission
 *
 * @returns {Promise<OrganizationMember[]>}
 */
export async function getOrganizationMembers() {
  return withPermission("organization.viewMembers", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.organization.getMembers.query({
      organizationId,
    });
  });
}

/**
 * Get RBAC configuration for current organization
 * Requires organization.manageAccess permission
 *
 * @returns {Promise<RBACConfig>}
 */
export async function getRBACConfig() {
  return withPermission("organization.manageAccess", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.organization.getRBACConfig.query({
      organizationId,
    });
  });
}

/**
 * Get pending invitations
 * Requires organization.manageMembers permission
 *
 * @returns {Promise<Invitation[]>}
 */
export async function getPendingInvitations() {
  return withPermission("organization.manageMembers", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.organization.getInvitations.query({
      organizationId,
      status: "pending",
    });
  });
}
