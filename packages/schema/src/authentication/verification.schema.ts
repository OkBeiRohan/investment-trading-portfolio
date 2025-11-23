import z from "zod";

export const verificationSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type IVerification = z.infer<typeof verificationSchema>;
