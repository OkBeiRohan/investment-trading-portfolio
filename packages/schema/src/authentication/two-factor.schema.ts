import z from "zod";

export const twoFactorSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  secret: z.string(),
  backupCodes: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ITwoFactor = z.infer<typeof twoFactorSchema>;
