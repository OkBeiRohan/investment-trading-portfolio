import { z } from "zod";

/**
 * Delete Account Schema
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().refine((val) => val === "DELETE", {
    message: "Please type DELETE to confirm",
  }),
  reason: z.string().max(500).optional(),
});

export type DeleteAccount = z.infer<typeof deleteAccountSchema>;

/**
 * Admin Delete User Schema
 */
export const adminDeleteUserSchema = z.object({
  id: z.uuid(),
  reason: z.string().min(1).max(500),
  permanentDelete: z.boolean().default(false), // true = hard delete, false = soft delete
});

export type AdminDeleteUser = z.infer<typeof adminDeleteUserSchema>;
