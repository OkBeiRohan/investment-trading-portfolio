import { useState, useEffect, useCallback } from "react";
import type { AuthClient, InferOrganization } from "../auth-client.types";

export interface UseOrganizationOptions {
  authClient: AuthClient;
  organizationId?: string;
}

export interface UseOrganizationReturn {
  organization: InferOrganization | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setActive: (organizationId: string) => Promise<void>;
}

export const useOrganization = (
  options: UseOrganizationOptions
): UseOrganizationReturn => {
  const { authClient, organizationId } = options;
  const [organization, setOrganization] = useState<InferOrganization | null>(
    null
  );
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
  }, [authClient, organizationId]);

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
    [authClient, fetchOrganization]
  );

  return {
    organization,
    isLoading,
    error,
    refetch: fetchOrganization,
    setActive,
  };
};
