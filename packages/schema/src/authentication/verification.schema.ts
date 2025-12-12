import z from "zod";

export const verificationSchema = z.object({
  id: z.uuid(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type IVerification = z.infer<typeof verificationSchema>;
