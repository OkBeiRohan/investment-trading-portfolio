import { z } from "zod";

/**
 * Session Schema
 */
export const sessionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  token: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
  refreshExpiresAt: z.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  lastActivityAt: z.date(),
  createdAt: z.date(),
});

export type Session = z.infer<typeof sessionSchema>;
