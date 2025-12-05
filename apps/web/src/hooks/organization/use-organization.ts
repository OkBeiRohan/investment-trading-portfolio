"use client";

import { authClient } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrganizationRole } from "@repo/schema";
import { useOrganizationData } from "@/hooks/auth/use-organization-data";

/**
 * Organization Management Hook
 *
 * Handles organization operations: create, switch, invite members, etc.
 */
export function useOrganization() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    organization: activeOrg,
    isLoading,
    error,
    refetch,
    setActive,
  } = useOrganizationData();

  const switchOrganization = async (organizationId: string) => {
    setLoading(true);
    try {
      await setActive(organizationId);
      router.refresh();
    } catch (err) {
      console.error("Failed to switch organization:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (data: { name: string; slug: string }) => {
    setLoading(true);
    try {
      const result = await authClient.organization.create(data);

      if (result.data) {
        router.push(`/dashboard/organizations/${result.data.id}`);
        router.refresh();
      }

      return result;
    } catch (err) {
      console.error("Failed to create organization:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async (data: {
    organizationId: string;
    email: string;
    role: OrganizationRole;
  }) => {
    setLoading(true);
    try {
      const result = await authClient.organization.inviteMember(data);
      await refetch();
      return result;
    } catch (err) {
      console.error("Failed to invite member:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (data: {
    organizationId: string;
    memberIdOrEmail: string;
  }) => {
    setLoading(true);
    try {
      const result = await authClient.organization.removeMember(data);
      await refetch();
      return result;
    } catch (err) {
      console.error("Failed to remove member:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (data: {
    organizationId: string;
    memberId: string;
    role: OrganizationRole;
  }) => {
    setLoading(true);
    try {
      const result = await authClient.organization.updateMemberRole(data);
      await refetch();
      return result;
    } catch (err) {
      console.error("Failed to update member role:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    activeOrganization: activeOrg,
    isLoading: isLoading || loading,
    error,
    refetch,
    switchOrganization,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
}
