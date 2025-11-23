import z from "zod";

export const authProviderSchema = z.object({
  provider: z.string(),
  providerId: z.string(),
  accountId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type IAuthProvider = z.infer<typeof authProviderSchema>;
