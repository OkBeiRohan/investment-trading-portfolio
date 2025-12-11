import { registerAs } from '@nestjs/config';
import { IEnvironment, environmentSchema } from '.';
import z from 'zod';

export const CONFIG_TOKEN = 'config';

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
