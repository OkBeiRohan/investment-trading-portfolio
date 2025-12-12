/**
 * Admin Data Access Layer
 *
 * Restricted to admin/owner roles only.
 * All functions require admin.* permissions.
 */

import { withPermission, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";

/**
 * Get AI model training runs
 * Requires admin.viewModels permission
 *
 * @returns {Promise<TrainingRun[]>}
 */
export async function getTrainingRuns() {
  return withPermission("admin.viewModels", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.aiModels.getTrainingRuns.query({
      organizationId,
    });
  });
}

/**
 * Get model inference metrics
 * Requires admin.viewModels permission
 *
 * @param {string} modelId - Model ID
 * @returns {Promise<InferenceMetrics>}
 */
export async function getInferenceMetrics(modelId: string) {
  return withPermission("admin.viewModels", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.aiModels.getInferenceMetrics.query({
      organizationId,
      modelId,
    });
  });
}

/**
 * Get model drift detection data
 * Requires admin.viewModels permission
 *
 * @param {string} modelId - Model ID
 * @returns {Promise<ModelDrift>}
 */
export async function getModelDrift(modelId: string) {
  return withPermission("admin.viewModels", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.aiModels.getDrift.query({
      organizationId,
      modelId,
    });
  });
}

/**
 * Get agentic trace for a trade
 * Requires admin.viewAgents permission
 *
 * @param {string} traceId - Trace ID
 * @returns {Promise<TradeTrace>}
 */
export async function getAgentTrace(traceId: string) {
  return withPermission("admin.viewAgents", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.agents.getTrace.query({
      organizationId,
      traceId,
    });
  });
}

/**
 * Get circuit breaker configuration
 * Requires admin.viewRisk permission
 *
 * @returns {Promise<CircuitBreakerConfig[]>}
 */
export async function getCircuitBreakers() {
  return withPermission("admin.viewRisk", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.risk.getCircuitBreakers.query({
      organizationId,
    });
  });
}

/**
 * Get audit trail entries
 * Requires admin.viewCompliance permission
 *
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @returns {Promise<AuditTrailResponse>}
 */
export async function getAuditTrail(params: { page: number; limit: number }) {
  return withPermission("admin.viewCompliance", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.compliance.getAuditTrail.query({
      organizationId,
      ...params,
    });
  });
}

/**
 * Get system health metrics
 * Requires admin.viewSystem permission
 *
 * @returns {Promise<SystemHealth>}
 */
export async function getSystemHealth() {
  return withPermission("admin.viewSystem", async () => {
    const { organizationId } = await getUserOrganization();

    return trpc.admin.system.getHealth.query({
      organizationId,
    });
  });
}
