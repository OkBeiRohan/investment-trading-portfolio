/**
 * Trading Server Actions
 *
 * All mutations require specific permissions and validate inputs.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  withPermission,
  assertResourceOwnership,
  getUserOrganization,
} from "../dal";
import { trpc } from "@/lib/trpc/server";
import { z } from "zod";

/**
 * Update strategy parameters in real-time
 * Requires trade.manageStrategies permission
 *
 * @param {Object} params - Update parameters
 * @param {string} params.strategyId - Strategy ID
 * @param {Object} params.parameters - New parameters
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function updateStrategyParameters(params: {
  strategyId: string;
  parameters: Record<string, unknown>;
}) {
  try {
    // Input validation
    const schema = z.object({
      strategyId: z.string().min(1),
      parameters: z.record(z.unknown()),
    });

    const validated = schema.parse(params);

    return withPermission("trade.manageStrategies", async () => {
      const { organizationId } = await getUserOrganization();

      // Verify strategy ownership
      const strategy = await trpc.trade.strategies.get.query({
        organizationId,
        strategyId: validated.strategyId,
      });

      await assertResourceOwnership(strategy.organizationId);

      // Update parameters
      await trpc.trade.strategies.updateParameters.mutate({
        organizationId,
        strategyId: validated.strategyId,
        parameters: validated.parameters,
      });

      // Revalidate strategy pages
      revalidatePath(`/trade/strategies/${validated.strategyId}`);
      revalidatePath("/trade/strategies/active");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to update strategy parameters:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update parameters",
    };
  }
}

/**
 * Start a strategy
 * Requires trade.executeStrategies permission
 *
 * @param {string} strategyId - Strategy ID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function startStrategy(strategyId: string) {
  try {
    const schema = z.string().min(1);
    const validated = schema.parse(strategyId);

    return withPermission("trade.executeStrategies", async () => {
      const { organizationId } = await getUserOrganization();

      // Verify ownership
      const strategy = await trpc.trade.strategies.get.query({
        organizationId,
        strategyId: validated,
      });

      await assertResourceOwnership(strategy.organizationId);

      // Start strategy
      await trpc.trade.strategies.start.mutate({
        organizationId,
        strategyId: validated,
      });

      revalidatePath(`/trade/strategies/${validated}`);
      revalidatePath("/trade/strategies/active");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to start strategy:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to start strategy",
    };
  }
}

/**
 * Stop a strategy
 * Requires trade.executeStrategies permission
 *
 * @param {string} strategyId - Strategy ID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function stopStrategy(strategyId: string) {
  try {
    const schema = z.string().min(1);
    const validated = schema.parse(strategyId);

    return withPermission("trade.executeStrategies", async () => {
      const { organizationId } = await getUserOrganization();

      const strategy = await trpc.trade.strategies.get.query({
        organizationId,
        strategyId: validated,
      });

      await assertResourceOwnership(strategy.organizationId);

      await trpc.trade.strategies.stop.mutate({
        organizationId,
        strategyId: validated,
      });

      revalidatePath(`/trade/strategies/${validated}`);
      revalidatePath("/trade/strategies/active");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to stop strategy:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to stop strategy",
    };
  }
}

/**
 * Create a new strategy
 * Requires trade.manageStrategies permission
 *
 * @param {Object} params - Strategy creation parameters
 * @returns {Promise<{success: boolean, strategyId?: string, message?: string}>}
 */
export async function createStrategy(params: {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  nodes?: unknown[];
  edges?: unknown[];
}) {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100),
      type: z.string().min(1),
      parameters: z.record(z.unknown()),
      nodes: z.array(z.unknown()).optional(),
      edges: z.array(z.unknown()).optional(),
    });

    const validated = schema.parse(params);

    return withPermission("trade.manageStrategies", async () => {
      const { organizationId } = await getUserOrganization();

      const strategy = await trpc.trade.strategies.create.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/trade/strategies");

      return {
        success: true,
        strategyId: strategy.id,
      };
    });
  } catch (error) {
    console.error("Failed to create strategy:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create strategy",
    };
  }
}
