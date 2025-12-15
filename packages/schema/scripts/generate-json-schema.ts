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
  orderPlacementSchema,
  multiLegOrderRequestSchema,
} from "../src/trading/order.schema";

import {
  positionSchema,
  positionLegSchema,
} from "../src/trading/position.schema";

import { strategySchema } from "../src/trading/strategy.schema";

import {
  rlAgentStateSchema,
  rlStateSnapshotSchema,
  rlPerformanceSchema,
} from "../src/trading/rl-agent.schema";

import { greeksSchema, costBreakdownSchema } from "../src/trading/base";

const OUTPUT_DIR = join(__dirname, "../generated");

console.log("🔧 Generating JSON Schemas from Zod...\n");

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Define all schemas to export
const schemas = {
  // Feature schemas
  FeatureSnapshot: zodToJsonSchema(featureSnapshotSchema as any, {
    name: "FeatureSnapshot",
    $refStrategy: "none",
  }),
  Features: zodToJsonSchema(featuresSchema as any, {
    name: "Features",
    $refStrategy: "none",
  }),
  MACD: zodToJsonSchema(macdSchema as any, {
    name: "MACD",
    $refStrategy: "none",
  }),
  FeatureMetadata: zodToJsonSchema(featureMetadataSchema as any, {
    name: "FeatureMetadata",
    $refStrategy: "none",
  }),

  // Signal schemas
  TradingSignal: zodToJsonSchema(tradingSignalSchema as any, {
    name: "TradingSignal",
    $refStrategy: "none",
  }),
  ModelContributions: zodToJsonSchema(modelContributionsSchema as any, {
    name: "ModelContributions",
    $refStrategy: "none",
  }),
  SignalMetadata: zodToJsonSchema(signalMetadataSchema as any, {
    name: "SignalMetadata",
    $refStrategy: "none",
  }),

  // Order schemas
  Order: zodToJsonSchema(orderSchema as any, {
    name: "Order",
    $refStrategy: "none",
  }),
  OrderLeg: zodToJsonSchema(orderLegSchema as any, {
    name: "OrderLeg",
    $refStrategy: "none",
  }),
  OrderPlacement: zodToJsonSchema(orderPlacementSchema as any, {
    name: "OrderPlacement",
    $refStrategy: "none",
  }),
  MultiLegOrderRequest: zodToJsonSchema(multiLegOrderRequestSchema as any, {
    name: "MultiLegOrderRequest",
    $refStrategy: "none",
  }),

  // Position schemas
  Position: zodToJsonSchema(positionSchema as any, {
    name: "Position",
    $refStrategy: "none",
  }),
  PositionLeg: zodToJsonSchema(positionLegSchema as any, {
    name: "PositionLeg",
    $refStrategy: "none",
  }),
  Greeks: zodToJsonSchema(greeksSchema as any, {
    name: "Greeks",
    $refStrategy: "none",
  }),
  CostBreakdown: zodToJsonSchema(costBreakdownSchema as any, {
    name: "CostBreakdown",
    $refStrategy: "none",
  }),

  // Strategy schemas
  Strategy: zodToJsonSchema(strategySchema as any, {
    name: "Strategy",
    $refStrategy: "none",
  }),

  // RL Agent schemas
  RLAgentState: zodToJsonSchema(rlAgentStateSchema as any, {
    name: "RLAgentState",
    $refStrategy: "none",
  }),
  RLStateSnapshot: zodToJsonSchema(rlStateSnapshotSchema as any, {
    name: "RLStateSnapshot",
    $refStrategy: "none",
  }),
  RLPerformance: zodToJsonSchema(rlPerformanceSchema as any, {
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
