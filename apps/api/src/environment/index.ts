import z from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'staging', 'test']),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10)),
    DEVTOOLS: z
      .string()
      .transform((val) => val === 'true')
      .default(false),
  })
  .transform((data) => ({
    environment: data.NODE_ENV,
    port: data.PORT,
    devtools: data.DEVTOOLS,
  }));

export type IEnvironment = z.infer<typeof environmentSchema>;
