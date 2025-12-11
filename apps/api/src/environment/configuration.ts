import { registerAs } from '@nestjs/config';
import { CONFIG_TOKEN, environmentSchema, IEnvironment } from '@repo/schema';
import z from 'zod';

export const registerConfiguration = registerAs(
  CONFIG_TOKEN,
  (): IEnvironment => {
    const result = environmentSchema.safeParse(process.env);

    if (!result.success) {
      console.error('❌ Invalid environment variables:');
      console.error(z.treeifyError(result.error));
      throw new Error(
        `Environment validation failed: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    }

    return result.data;
  },
);

export default registerConfiguration;
