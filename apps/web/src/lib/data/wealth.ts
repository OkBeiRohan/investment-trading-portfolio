/**
 * Wealth Management Data Access Layer
 *
 * All functions in this module automatically verify authentication and scope queries
 * to the current user's organization.
 */

import { withAuth, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";

/**
 * Get net worth data for the current user's organization
 * Includes liquid assets, locked assets, and liabilities
 *
 * @returns {Promise<NetWorthData>}
 */
export async function getNetWorthData(): Promise<NetWorthData> {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    // Call tRPC with organization scope
    const data = await trpc.wealth.getNetWorth.query({
      organizationId,
    });

    return data;
  });
}

/**
 * Get asset allocation hierarchy for sunburst visualization
 *
 * @returns {Promise<AssetHierarchy[]>}
 */
export async function getAssetAllocation(): Promise<AssetHierarchy[]> {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    const data = await trpc.wealth.getAssetAllocation.query({
      organizationId,
    });

    return data;
  });
}

/**
 * Get detailed asset data by asset ID
 * Verifies that the asset belongs to the user's organization
 *
 * @param {string} assetId - The asset ID
 * @returns {Promise<Asset>}
 */
export async function getAssetDetails(assetId: string) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    const asset = await trpc.wealth.getAssetDetails.query({
      organizationId,
      assetId,
    });

    // Additional ownership verification
    if (asset.organizationId !== organizationId) {
      throw new Error("Asset not found or access denied");
    }

    return asset;
  });
}

/**
 * Get portfolio performance metrics
 *
 * @param {Object} params - Query parameters
 * @param {string} params.period - Time period ('1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL')
 * @returns {Promise<PerformanceMetrics>}
 */
export async function getPortfolioPerformance(params: { period: string }) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.wealth.getPerformance.query({
      organizationId,
      ...params,
    });
  });
}
