#!/usr/bin/env tsx
/**
 * Generate JSON Schema from Zod schemas for Python type generation
 * Run this after modifying any .schema.ts files in packages/schema
 *
 * NOTE: This uses a custom converter for Zod 4.x compatibility
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

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

console.log("🔧 Generating JSON Schemas from Zod 4.x...\n");

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Helper function to extract JSON Schema from Zod 4.x schema
 * Zod 4.x has a different internal structure than 3.x
 */
function extractJsonSchema(zodSchema: any, name: string): any {
  const convert = (schema: any, depth = 0): any => {
    if (!schema || !schema.def) {
      return { type: "any" };
    }

    const def = schema.def;
    const type = def.type;

    // Handle Zod 4.x specific types
    switch (type) {
      case "string":
        const stringSchema: any = { type: "string" };
        // Add string-specific validations if they exist
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === "email") stringSchema.format = "email";
            if (check.kind === "uuid") stringSchema.format = "uuid";
            if (check.kind === "url") stringSchema.format = "uri";
            if (check.kind === "min") stringSchema.minLength = check.value;
            if (check.kind === "max") stringSchema.maxLength = check.value;
          }
        }
        return stringSchema;

      case "number":
        const numberSchema: any = { type: "number" };
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === "min") numberSchema.minimum = check.value;
            if (check.kind === "max") numberSchema.maximum = check.value;
            if (check.kind === "int") numberSchema.type = "integer";
          }
        }
        return numberSchema;

      case "boolean":
        return { type: "boolean" };

      case "date":
        return { type: "string", format: "date-time" };

      case "optional":
        return convert(def.innerType, depth + 1);

      case "nullable":
        const nullableInner = convert(def.innerType, depth + 1);
        return { oneOf: [nullableInner, { type: "null" }] };

      case "array":
        return {
          type: "array",
          items: convert(def.type, depth + 1),
        };

      case "object":
        const properties: any = {};
        const required: string[] = [];

        if (def.shape) {
          for (const [key, value] of Object.entries(def.shape as any)) {
            properties[key] = convert(value, depth + 1);

            // Check if field is required (not optional/nullable)
            const fieldDef = (value as any).def;
            if (
              fieldDef &&
              fieldDef.type !== "optional" &&
              fieldDef.type !== "nullable"
            ) {
              required.push(key);
            }
          }
        }

        const objSchema: any = {
          type: "object",
          properties,
        };

        if (required.length > 0) {
          objSchema.required = required;
        }

        return objSchema;

      case "enum":
        // Zod 4.x enum structure
        if (def.values) {
          if (typeof def.values === "object" && !Array.isArray(def.values)) {
            // Object enum: { KEY: "value" }
            return { enum: Object.values(def.values) };
          } else if (Array.isArray(def.values)) {
            return { enum: def.values };
          }
        }
        return { type: "string" };

      case "union":
        if (def.options && Array.isArray(def.options)) {
          return {
            oneOf: def.options.map((opt: any) => convert(opt, depth + 1)),
          };
        }
        return { type: "any" };

      case "record":
        return {
          type: "object",
          additionalProperties: def.valueType
            ? convert(def.valueType, depth + 1)
            : true,
        };

      case "literal":
        return { const: def.value };

      case "any":
        return {};

      case "unknown":
        return {};

      default:
        console.warn(`  ⚠️  Unsupported Zod type: ${type} in ${name}`);
        return { type: "any", description: `Unsupported Zod type: ${type}` };
    }
  };

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: name,
    ...convert(zodSchema, 0),
  };
}

// Define all schemas to export
const schemas: Record<string, any> = {
  // Feature schemas
  FeatureSnapshot: extractJsonSchema(featureSnapshotSchema, "FeatureSnapshot"),
  Features: extractJsonSchema(featuresSchema, "Features"),
  MACD: extractJsonSchema(macdSchema, "MACD"),
  FeatureMetadata: extractJsonSchema(featureMetadataSchema, "FeatureMetadata"),

  // Signal schemas
  TradingSignal: extractJsonSchema(tradingSignalSchema, "TradingSignal"),
  ModelContributions: extractJsonSchema(
    modelContributionsSchema,
    "ModelContributions"
  ),
  SignalMetadata: extractJsonSchema(signalMetadataSchema, "SignalMetadata"),

  // Order schemas
  Order: extractJsonSchema(orderSchema, "Order"),
  OrderLeg: extractJsonSchema(orderLegSchema, "OrderLeg"),
  OrderPlacement: extractJsonSchema(orderPlacementSchema, "OrderPlacement"),
  MultiLegOrderRequest: extractJsonSchema(
    multiLegOrderRequestSchema,
    "MultiLegOrderRequest"
  ),

  // Position schemas
  Position: extractJsonSchema(positionSchema, "Position"),
  PositionLeg: extractJsonSchema(positionLegSchema, "PositionLeg"),
  Greeks: extractJsonSchema(greeksSchema, "Greeks"),
  CostBreakdown: extractJsonSchema(costBreakdownSchema, "CostBreakdown"),

  // Strategy schemas
  Strategy: extractJsonSchema(strategySchema, "Strategy"),

  // RL Agent schemas
  RLAgentState: extractJsonSchema(rlAgentStateSchema, "RLAgentState"),
  RLStateSnapshot: extractJsonSchema(rlStateSnapshotSchema, "RLStateSnapshot"),
  RLPerformance: extractJsonSchema(rlPerformanceSchema, "RLPerformance"),
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
  "  1. Run Python type generator: cd services/training-pipeline && python scripts/generate_types.py"
);
console.log(
  "  2. Use generated schemas in Python with pydantic or dataclass-wizard\n"
);
