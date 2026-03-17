import { registerAs } from "@nestjs/config";
import {
  ALGO_WORKER_CONFIG_TOKEN,
  algoWorkerEnvironmentSchema,
  IAlgoWorkerEnvironment,
} from "@repo/schema";
import z from "zod";

export const registerConfiguration = registerAs(
  ALGO_WORKER_CONFIG_TOKEN,
  (): IAlgoWorkerEnvironment => {
    const result = algoWorkerEnvironmentSchema.safeParse(process.env);

    if (!result.success) {
      console.error("❌ Invalid environment variables:");
      console.error(z.treeifyError(result.error));
      throw new Error(
        `Environment validation failed: ${result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      );
    }

    return result.data;
  },
);

export default registerConfiguration;
