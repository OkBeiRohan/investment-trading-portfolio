import { registerAs } from '@nestjs/config';
import { IEnvironment, environmentSchema } from '.';

export const CONFIG_TOKEN = 'config';

export const registerConfiguration = registerAs(
  CONFIG_TOKEN,
  (): IEnvironment => {
    const parsedEnv = environmentSchema.parse(process.env);
    return parsedEnv;
  },
);

export default registerConfiguration;
