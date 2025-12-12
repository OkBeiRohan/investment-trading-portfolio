import z from "zod";

export const passkeySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().optional(),
  publicKey: z.string(),
  credentialID: z.string(),
  counter: z.number().default(0),
  deviceType: z.string().optional(),
  backedUp: z.boolean().default(false),
  transports: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type IPasskey = z.infer<typeof passkeySchema>;
