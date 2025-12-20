import z from "zod";

export const accountSchema = z.object({
  userId: z.uuid(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  accessTokenExpiresAt: z.date().optional(),
  refreshTokenExpiresAt: z.date().optional(),
  scope: z.string().optional(),
  idToken: z.string().optional(),
  password: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type IAccount = z.infer<typeof accountSchema>;
