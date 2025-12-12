"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth/auth-client";
import { IOrganization } from "@repo/schema";

export interface OrganizationContextValue {
  organization: IOrganization | null;
  organizations: IOrganization[];
  activeOrganizationId: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setActive: (organizationId: string) => Promise<void>;
}

export const OrganizationContext = createContext<
  OrganizationContextValue | undefined
>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * OrganizationProvider Component
 *
 * Provides organization state to the entire application.
 * Should be mounted once at the root level in app/layout.tsx or app/providers.tsx.
 *
 * This ensures:
 * - Single organization fetch on app load
 * - Shared organization state across all components
 * - No redundant API calls
 * - Automatic active organization tracking from session
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [organization, setOrganization] = useState<IOrganization | null>(null);
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get session to find active organization
      const sessionResponse = await authClient.getSession({
        fetchOptions: {
          credentials: "include",
        },
      });

      if (!sessionResponse.data?.session?.activeOrganizationId) {
        setOrganization(null);
        setOrganizations([]);
        setActiveOrganizationId(null);
        setIsLoading(false);
        return;
      }

      const orgId = sessionResponse.data.session.activeOrganizationId;
      setActiveOrganizationId(orgId);

      // Fetch full organization details
      const orgResponse = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });

      if (orgResponse.data) {
        setOrganization(orgResponse.data);
      } else {
        setOrganization(null);
      }

      // Fetch all organizations for the user
      const allOrgsResponse = await authClient.organization.list();
      if (allOrgsResponse.data) {
        setOrganizations(allOrgsResponse.data);
      } else {
        setOrganizations([]);
      }
    } catch (err) {
      console.error("Failed to fetch organization:", err);
      setError(err as Error);
      setOrganization(null);
      setOrganizations([]);
      setActiveOrganizationId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        console.error("Failed to set active organization:", err);
        setError(err as Error);
      }
    },
    [fetchOrganization]
  );

  const value: OrganizationContextValue = {
    organization,
    organizations,
    activeOrganizationId,
    isLoading,
    error,
    refetch: fetchOrganization,
    setActive,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
