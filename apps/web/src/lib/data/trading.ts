/**
 * Trading Data Access Layer
 *
 * All functions verify authentication and scope to user's organization.
 * Sensitive operations (execute, stop) require specific permissions.
 */

import {
  withAuth,
  withPermission,
  getUserOrganization,
  assertResourceOwnership,
} from "../dal";
import { trpc } from "@/lib/trpc/client";

/**
 * Get volatility surface data for options analytics
 *
 * @param {Object} params - Query parameters
 * @param {string} params.symbol - Symbol (e.g., 'NIFTY')
 * @param {string} params.expiry - Expiry type ('WEEKLY' | 'MONTHLY')
 * @returns {Promise<VolatilitySurface>}
 */
export async function getVolatilitySurface(params: {
  symbol: string;
  expiry: string;
}) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.options.volatilitySurface.query({
      organizationId,
      ...params,
    });
  });
}

/**
 * Get gamma exposure (GEX) data
 *
 * @param {Object} params - Query parameters
 * @param {string} params.symbol - Symbol
 * @returns {Promise<GammaExposure>}
 */
export async function getGammaExposure(params: { symbol: string }) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.options.gammaExposure.query({
      organizationId,
      ...params,
    });
  });
}

/**
 * Get all active strategies for the organization
 *
 * @returns {Promise<Strategy[]>}
 */
export async function getActiveStrategies() {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.strategies.getAll.query({
      organizationId,
      status: "active",
    });
  });
}

/**
 * Get strategy details by ID
 * Verifies strategy belongs to user's organization
 *
 * @param {string} strategyId - Strategy ID
 * @returns {Promise<Strategy>}
 */
export async function getStrategyDetails(strategyId: string) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    const strategy = await trpc.trade.strategies.get.query({
      organizationId,
      strategyId,
    });

    // Verify ownership
    await assertResourceOwnership(strategy.organizationId);

    return strategy;
  });
}

/**
 * Get execution quality metrics
 *
 * @param {Object} params - Query parameters
 * @param {string} params.period - Time period
 * @returns {Promise<ExecutionMetrics>}
 */
export async function getExecutionMetrics(params: { period: string }) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.execution.getMetrics.query({
      organizationId,
      ...params,
    });
  });
}

/**
 * Get current positions
 *
 * @returns {Promise<Position[]>}
 */
export async function getCurrentPositions() {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.positions.getAll.query({
      organizationId,
    });
  });
}

/**
 * Get trade history with pagination
 *
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<TradeHistoryResponse>}
 */
export async function getTradeHistory(params: { page: number; limit: number }) {
  return withAuth(async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.trade.history.getAll.query({
      organizationId,
      ...params,
    });
  });
}
