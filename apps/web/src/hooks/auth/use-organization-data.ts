"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { IOrganization } from "@repo/schema";

export interface UseOrganizationDataReturn {
  organization: IOrganization | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setActive: (organizationId: string) => Promise<void>;
}

/**
 * Organization Data Hook
 *
 * Fetches and manages single organization data
 */
export function useOrganizationData(
  organizationId?: string
): UseOrganizationDataReturn {
  const [organization, setOrganization] = useState<IOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    if (!organizationId) {
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await authClient.organization.getFullOrganization({
        query: { organizationId },
      });

      if (response.data) {
        setOrganization(response.data);
      } else {
        setOrganization(null);
      }
    } catch (err) {
      setError(err as Error);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const setActive = useCallback(
    async (orgId: string) => {
      try {
        await authClient.organization.setActive({
          organizationId: orgId,
        });
        await fetchOrganization();
      } catch (err) {
        setError(err as Error);
      }
    },
    [fetchOrganization]
  );

  return {
    organization,
    isLoading,
    error,
    refetch: fetchOrganization,
    setActive,
  };
}
