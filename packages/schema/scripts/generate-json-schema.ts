#!/usr/bin/env tsx
/**
 * Generate JSON Schema from Zod schemas for Python type generation
 * Run this after modifying any .schema.ts files in packages/schema
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { zodToJsonSchema } from "zod-to-json-schema";

// Import all trading schemas
import {
  featureSnapshotSchema,
  featuresSchema,
  macdSchema,
  featureMetadataSchema,
} from "../src/trading/feature.schema";

import {
  tradingSignalSchema,
  modelContributionsSchema,
  signalMetadataSchema,
} from "../src/trading/signal.schema";

import {
  orderSchema,
  orderLegSchema,
  orderCreateInputSchema,
} from "../src/trading/order.schema";

import {
  positionSchema,
  positionLegSchema,
  greeksSchema,
  costsSchema,
} from "../src/trading/position.schema";

import {
  strategySchema,
  strategyLegSchema,
  riskProfileSchema,
} from "../src/trading/strategy.schema";

import {
  performanceMetricsSchema,
  tradeMetricsSchema,
  costMetricsSchema,
} from "../src/trading/performance.schema";

import {
  rlAgentStateSchema,
  rlStateSnapshotSchema,
  rlPerformanceSchema,
} from "../src/trading/rl-agent.schema";

const OUTPUT_DIR = join(__dirname, "../generated");

console.log("🔧 Generating JSON Schemas from Zod...\n");

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Define all schemas to export
const schemas = {
  // Feature schemas
  FeatureSnapshot: zodToJsonSchema(featureSnapshotSchema, {
    name: "FeatureSnapshot",
    $refStrategy: "none",
  }),
  Features: zodToJsonSchema(featuresSchema, {
    name: "Features",
    $refStrategy: "none",
  }),
  MACD: zodToJsonSchema(macdSchema, {
    name: "MACD",
    $refStrategy: "none",
  }),
  FeatureMetadata: zodToJsonSchema(featureMetadataSchema, {
    name: "FeatureMetadata",
    $refStrategy: "none",
  }),

  // Signal schemas
  TradingSignal: zodToJsonSchema(tradingSignalSchema, {
    name: "TradingSignal",
    $refStrategy: "none",
  }),
  ModelContributions: zodToJsonSchema(modelContributionsSchema, {
    name: "ModelContributions",
    $refStrategy: "none",
  }),
  SignalMetadata: zodToJsonSchema(signalMetadataSchema, {
    name: "SignalMetadata",
    $refStrategy: "none",
  }),

  // Order schemas
  Order: zodToJsonSchema(orderSchema, {
    name: "Order",
    $refStrategy: "none",
  }),
  OrderLeg: zodToJsonSchema(orderLegSchema, {
    name: "OrderLeg",
    $refStrategy: "none",
  }),
  OrderCreateInput: zodToJsonSchema(orderCreateInputSchema, {
    name: "OrderCreateInput",
    $refStrategy: "none",
  }),

  // Position schemas
  Position: zodToJsonSchema(positionSchema, {
    name: "Position",
    $refStrategy: "none",
  }),
  PositionLeg: zodToJsonSchema(positionLegSchema, {
    name: "PositionLeg",
    $refStrategy: "none",
  }),
  Greeks: zodToJsonSchema(greeksSchema, {
    name: "Greeks",
    $refStrategy: "none",
  }),
  Costs: zodToJsonSchema(costsSchema, {
    name: "Costs",
    $refStrategy: "none",
  }),

  // Strategy schemas
  Strategy: zodToJsonSchema(strategySchema, {
    name: "Strategy",
    $refStrategy: "none",
  }),
  StrategyLeg: zodToJsonSchema(strategyLegSchema, {
    name: "StrategyLeg",
    $refStrategy: "none",
  }),
  RiskProfile: zodToJsonSchema(riskProfileSchema, {
    name: "RiskProfile",
    $refStrategy: "none",
  }),

  // Performance schemas
  PerformanceMetrics: zodToJsonSchema(performanceMetricsSchema, {
    name: "PerformanceMetrics",
    $refStrategy: "none",
  }),
  TradeMetrics: zodToJsonSchema(tradeMetricsSchema, {
    name: "TradeMetrics",
    $refStrategy: "none",
  }),
  CostMetrics: zodToJsonSchema(costMetricsSchema, {
    name: "CostMetrics",
    $refStrategy: "none",
  }),

  // RL Agent schemas
  RLAgentState: zodToJsonSchema(rlAgentStateSchema, {
    name: "RLAgentState",
    $refStrategy: "none",
  }),
  RLStateSnapshot: zodToJsonSchema(rlStateSnapshotSchema, {
    name: "RLStateSnapshot",
    $refStrategy: "none",
  }),
  RLPerformance: zodToJsonSchema(rlPerformanceSchema, {
    name: "RLPerformance",
    $refStrategy: "none",
  }),
};

// Write individual schema files
Object.entries(schemas).forEach(([name, schema]) => {
  const filePath = join(OUTPUT_DIR, `${name}.schema.json`);
  writeFileSync(filePath, JSON.stringify(schema, null, 2));
  console.log(`✅ Generated: ${name}.schema.json`);
});

// Write combined schema file for Python generator
const combinedSchemaPath = join(OUTPUT_DIR, "schemas.json");
writeFileSync(combinedSchemaPath, JSON.stringify(schemas, null, 2));
console.log(`\n✅ Generated combined schema: schemas.json`);

console.log("\n🎉 JSON Schema generation complete!");
console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);
console.log("Next steps:");
console.log(
  "  1. Run Python type generator: cd apps/algo-worker/ml && python scripts/generate_types.py"
);
console.log("  2. Verify generated types: import types.feature_types\n");
