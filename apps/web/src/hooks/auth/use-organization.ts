"use client";

import {
  OrganizationContext,
  OrganizationContextValue,
} from "@/contexts/organization-context";
import { useContext } from "react";

/**
 * useOrganization Hook
 *
 * Access organization state from any Client Component.
 * Must be used within an OrganizationProvider.
 *
 * Provides:
 * - Active organization details
 * - List of all user's organizations
 * - Organization switching functionality
 *
 * @example
 * ```tsx
 * function OrgSwitcher() {
 *   const { organization, organizations, setActive, isLoading } = useOrganization();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <select
 *       value={organization?.id}
 *       onChange={(e) => setActive(e.target.value)}
 *     >
 *       {organizations.map((org) => (
 *         <option key={org.id} value={org.id}>
 *           {org.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { organization, isLoading } = useOrganization();
 *
 *   if (isLoading) return <Loading />;
 *   if (!organization) return <NoOrgPrompt />;
 *
 *   return <div>Welcome to {organization.name}!</div>;
 * }
 * ```
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }

  return context;
}
