import z from "zod";
import { Types } from "mongoose";

export const sessionSchema = z.object({
  userId: z.instanceof(Types.ObjectId),
  token: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  lastActivityAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ISession = z.infer<typeof sessionSchema>;
