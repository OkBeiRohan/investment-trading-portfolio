import z from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'staging', 'test'])
      .default('development'),
    PORT: z
      .string()
      .default('3004')
      .transform((val) => parseInt(val, 10)),
    DEVTOOLS: z
      .string()
      .default('false')
      .transform((val) => val === 'true'),
  })
  .transform((data) => ({
    environment: data.NODE_ENV,
    port: data.PORT,
    devtools: data.DEVTOOLS,
  }));

export type IEnvironment = z.infer<typeof environmentSchema>;
