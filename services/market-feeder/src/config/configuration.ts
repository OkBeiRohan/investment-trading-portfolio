import { registerAs } from "@nestjs/config";
import {
  MARKET_FEEDER_CONFIG_TOKEN,
  marketFeederEnvironmentSchema,
  IMarketFeederEnvironment,
} from "@repo/schema";
import z from "zod";

export const registerConfiguration = registerAs(
  MARKET_FEEDER_CONFIG_TOKEN,
  (): IMarketFeederEnvironment => {
    const result = marketFeederEnvironmentSchema.safeParse(process.env);

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
