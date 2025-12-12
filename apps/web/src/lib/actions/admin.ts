/**
 * Admin Server Actions
 *
 * All actions require admin permissions
 */

"use server";

import { revalidatePath } from "next/cache";
import { withPermission, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";
import { z } from "zod";

/**
 * Trigger global kill switch
 * Requires admin.executeKillSwitch permission
 * EMERGENCY USE ONLY
 */
export async function triggerKillSwitch(params: {
  type: "GLOBAL" | "STRATEGY" | "ORGANIZATION";
  targetId?: string;
  reason: string;
}) {
  try {
    const schema = z.object({
      type: z.enum(["GLOBAL", "STRATEGY", "ORGANIZATION"]),
      targetId: z.string().optional(),
      reason: z.string().min(10).max(500),
    });

    const validated = schema.parse(params);

    return withPermission("admin.executeKillSwitch", async () => {
      const { organizationId } = await getUserOrganization();

      await trpc.admin.risk.triggerKillSwitch.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/admin/risk");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to trigger kill switch:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to trigger kill switch",
    };
  }
}

/**
 * Update circuit breaker configuration
 * Requires admin.manageRisk permission
 */
export async function updateCircuitBreaker(params: {
  breakerId: string;
  enabled: boolean;
  threshold?: number;
}) {
  try {
    const schema = z.object({
      breakerId: z.string().min(1),
      enabled: z.boolean(),
      threshold: z.number().optional(),
    });

    const validated = schema.parse(params);

    return withPermission("admin.manageRisk", async () => {
      const { organizationId } = await getUserOrganization();

      await trpc.admin.risk.updateCircuitBreaker.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/admin/risk");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to update circuit breaker:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update circuit breaker",
    };
  }
}
