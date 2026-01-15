/**
 * Generate TypeScript types from Rust using ts-rs
 *
 * This script triggers Rust tests which auto-generate TypeScript types.
 * ts-rs ensures end-to-end type safety between Rust (compute-engine) and TypeScript (market-feeder).
 *
 * Generated files location: packages/schema/src/market-data/generated/*.ts
 *
 * Usage: pnpm run generate:rust-types
 */

import { execSync } from "child_process";
import { join } from "path";
import { mkdirSync } from "fs";

const computeEngineDir = join(
  __dirname,
  "../../../packages/compute-engine-napi"
);
const generatedDir = join(__dirname, "../src/market-data/generated");

// Ensure generated directory exists
mkdirSync(generatedDir, { recursive: true });

console.log("🦀 Generating TypeScript types from Rust...");
console.log("📍 Compute Engine:", computeEngineDir);
console.log("📍 Output:", generatedDir);

try {
  // Run Rust tests to trigger ts-rs type generation
  console.log("\n🔨 Running: cargo test --lib");
  execSync("cargo test --lib", {
    cwd: computeEngineDir,
    stdio: "inherit",
  });

  console.log("\n✅ TypeScript types generated successfully!");
  console.log("📂 Location:", generatedDir);
  console.log("\n📋 Generated types:");
  console.log("  - BidAskLevel.ts");
  console.log("  - NiftyFutureTick.ts");
  console.log("  - ConstituentTick.ts");
  console.log("  - OptionTick.ts");
  console.log("  - MarketSnapshot.ts");
  console.log("  - MacroState.ts");
  console.log("  - MicroState.ts");
  console.log("  - VolatilityState.ts");
  console.log("  - ExecutionState.ts");
  console.log("  - PortfolioState.ts");
  console.log("  - MarketState.ts");
  console.log("  - LightGBMInput.ts");
  console.log("  - LightGBMOutput.ts");
  console.log("\n🎯 Import from: @repo/schema/market-data/generated");
} catch (error) {
  console.error("❌ Failed to generate Rust types:", error);
  process.exit(1);
}
