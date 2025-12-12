/**
 * Data Access Layer - Public API
 *
 * This module exports all data access functions that can be used in Server Components.
 * All functions automatically verify authentication and organization scope.
 *
 * Usage in Server Components:
 *
 * ```typescript
 * import { getNetWorthData, getActiveStrategies } from '@/lib/data';
 *
 * export default async function WealthOverviewPage() {
 *   const netWorth = await getNetWorthData();
 *   return <NetWorthWaterfall data={netWorth} />;
 * }
 * ```
 *
 * DO NOT import from individual files - always use this index.
 */

// Re-export DAL utilities
export {
  verifySession,
  getUser,
  getUserOrganization,
  hasPermission,
  assertPermission,
  assertResourceOwnership,
  withAuth,
  withPermission,
} from "../dal";

// Wealth data access
export * from "./wealth";

// Trading data access
export * from "./trading";

// Account data access
export * from "./account";

// Organization data access
export * from "./organization";

// Admin data access (restricted)
export * from "./admin";
