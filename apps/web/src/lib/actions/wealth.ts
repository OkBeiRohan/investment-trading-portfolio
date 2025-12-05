/**
 * Wealth Management Server Actions
 */

"use server";

import { revalidatePath } from "next/cache";
import { withPermission, getUserOrganization } from "../dal";
import { trpc } from "@/lib/trpc/server";
import { z } from "zod";

/**
 * Add a new asset to portfolio
 * Requires wealth.manageAssets permission
 */
export async function addAsset(params: {
  type: string;
  name: string;
  value: number;
  metadata: Record<string, unknown>;
}) {
  try {
    const schema = z.object({
      type: z.string().min(1),
      name: z.string().min(1).max(200),
      value: z.number().positive(),
      metadata: z.record(z.unknown()),
    });

    const validated = schema.parse(params);

    return withPermission("wealth.manageAssets", async () => {
      const { organizationId } = await getUserOrganization();

      const asset = await trpc.wealth.addAsset.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/wealth/overview");
      revalidatePath("/wealth/assets");

      return { success: true, assetId: asset.id };
    });
  } catch (error) {
    console.error("Failed to add asset:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to add asset",
    };
  }
}

/**
 * Update asset value
 * Requires wealth.manageAssets permission
 */
export async function updateAssetValue(params: {
  assetId: string;
  value: number;
}) {
  try {
    const schema = z.object({
      assetId: z.string().min(1),
      value: z.number().positive(),
    });

    const validated = schema.parse(params);

    return withPermission("wealth.manageAssets", async () => {
      const { organizationId } = await getUserOrganization();

      await trpc.wealth.updateAssetValue.mutate({
        organizationId,
        ...validated,
      });

      revalidatePath("/wealth/overview");
      revalidatePath(`/wealth/${validated.assetId}`);

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to update asset:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update asset",
    };
  }
}
