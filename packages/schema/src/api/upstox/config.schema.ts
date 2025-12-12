import { z } from "zod";

export const upstoxConfigSchema = z.object({
  client_id: z.string().min(1, "Client ID (The API Key) is required"),
  client_secret: z
    .string()
    .min(1, "Client Secret (The API Secret) is required"),
  redirect_uri: z.url("Redirect URI is required and must be a valid URL"),
});

export type UpstoxConfig = z.infer<typeof upstoxConfigSchema>;
