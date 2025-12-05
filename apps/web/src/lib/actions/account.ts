/**
 * Account Server Actions
 */

"use server";

import { revalidatePath } from "next/cache";
import { withAuth, getUser } from "../dal";
import { trpc } from "@/lib/trpc/server";
import { z } from "zod";

/**
 * Update user profile
 */
export async function updateProfile(params: {
  name?: string;
  email?: string;
  phone?: string;
}) {
  try {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(10).max(15).optional(),
    });

    const validated = schema.parse(params);

    return withAuth(async () => {
      const user = await getUser();

      await trpc.account.updateProfile.mutate({
        userId: user.id,
        ...validated,
      });

      revalidatePath("/account/profile");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

/**
 * Link a new account (brokerage, bank, exchange)
 */
export async function linkAccount(params: {
  provider: string;
  accountType: string;
  credentials: Record<string, string>;
}) {
  try {
    const schema = z.object({
      provider: z.string().min(1),
      accountType: z.string().min(1),
      credentials: z.record(z.string()),
    });

    const validated = schema.parse(params);

    return withAuth(async () => {
      const user = await getUser();

      const account = await trpc.account.linkAccount.mutate({
        userId: user.id,
        ...validated,
      });

      revalidatePath("/account/linked-accounts");

      return { success: true, accountId: account.id };
    });
  } catch (error) {
    console.error("Failed to link account:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to link account",
    };
  }
}

/**
 * Unlink an account
 */
export async function unlinkAccount(accountId: string) {
  try {
    const schema = z.string().min(1);
    const validated = schema.parse(accountId);

    return withAuth(async () => {
      const user = await getUser();

      await trpc.account.unlinkAccount.mutate({
        userId: user.id,
        accountId: validated,
      });

      revalidatePath("/account/linked-accounts");

      return { success: true };
    });
  } catch (error) {
    console.error("Failed to unlink account:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to unlink account",
    };
  }
}
