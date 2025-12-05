/**
 * Organization Server Actions
 */

"use server";

import { revalidatePath } from "next/cache";
import { withPermission, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";
import { z } from "zod";

/**
 * Create a new team
 * Requires organization.manageTeams permission
 */
export async function createTeam(params: {
  name: string;
  description?: string;
}) {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    });

    const validated = schema.parse(params);

    return withPermission("organization.manageTeams", async () => {
      const { organizationId } = await getUserOrganization();

      const team = await trpc.organization.createTeam.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/organization/teams");

      return { success: true, teamId: team.id };
    });
  } catch (error) {
    console.error("Failed to create team:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create team",
    };
  }
}

/**
 * Invite a member to organization
 * Requires organization.manageMembers permission
 */
export async function inviteMember(params: {
  email: string;
  role: string;
  teamIds?: string[];
}) {
  try {
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(["owner", "admin", "member"]),
      teamIds: z.array(z.string()).optional(),
    });

    const validated = schema.parse(params);

    return withPermission("organization.manageMembers", async () => {
      const { organizationId } = await getUserOrganization();

      const invitation = await trpc.organization.inviteMember.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/organization/members");

      return { success: true, invitationId: invitation.id };
    });
  } catch (error) {
    console.error("Failed to invite member:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to invite member",
    };
  }
}

/**
 * Update member role
 * Requires organization.manageMembers permission
 */
export async function updateMemberRole(params: {
  memberId: string;
  role: string;
}) {
  try {
    const schema = z.object({
      memberId: z.string().min(1),
      role: z.enum(["owner", "admin", "member"]),
    });

    const validated = schema.parse(params);

    return withPermission("organization.manageMembers", async () => {
      const { organizationId } = await getUserOrganization();

      await trpc.organization.updateMemberRole.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/organization/members");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to update member role:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update role",
    };
  }
}

/**
 * Remove member from organization
 * Requires organization.manageMembers permission
 */
export async function removeMember(memberId: string) {
  try {
    const schema = z.string().min(1);
    const validated = schema.parse(memberId);

    return withPermission("organization.manageMembers", async () => {
      const { organizationId } = await getUserOrganization();

      await trpc.organization.removeMember.mutate({
        organizationId,
        memberId: validated,
      });

      revalidatePath("/organization/members");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
