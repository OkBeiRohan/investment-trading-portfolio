import z from "zod";

export const sessionSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  activeOrganizationId: z.string().optional().nullable(),
  impersonatedBy: z.string().optional().nullable(),
  lastActivityAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ISession = z.infer<typeof sessionSchema>;
