/**
 * Model Input/Output Schemas
 * Exact contracts for each model in the trading system
 */

import { z } from "zod";

// ============================================
// MODEL 1: LightGBM (Level-0 Macro Direction Brain)
// ============================================

export const lightgbmInputSchema = z.object({
  // A. Index Breadth (6 features)
  pctStocksAboveVwap: z.number(),
  pctStocksAboveEma20: z.number(),
  weightedReturnTop10: z.number(),
  advanceDeclineRatio: z.number(),
  breadthMomentum5m: z.number(),
  breadthVolatility: z.number(),

  // B. NIFTY Future State (7 features)
  futPriceVsVwap: z.number(),
  futRangePosition: z.number(),
  futReturn1m: z.number(),
  futReturn5m: z.number(),
  futAtrPercent: z.number(),
  futVolumeZscore: z.number(),
  futOiChange: z.number(),

  // C. Options Aggregate State (9 features)
  atmIv: z.number(),
  atmIvChange: z.number(),
  ivSkew: z.number(),
  gammaAtm: z.number(),
  vegaAtm: z.number(),
  thetaAtm: z.number(),
  pcrOi: z.number(),
  pcrVolume: z.number(),
  maxPainDistance: z.number(),

  // D. Volatility & Context (5 features)
  indiaVix: z.number(),
  realizedVol5m: z.number(),
  volExpansionRatio: z.number(),
  minutesFromOpen: z.number(),
  minutesToClose: z.number(),
  dayOfWeek: z.number(),
});

export type LightGBMInput = z.infer<typeof lightgbmInputSchema>;

export const lightgbmOutputSchema = z.object({
  pUp: z.number().min(0).max(1),
  pNeutral: z.number().min(0).max(1),
  pDown: z.number().min(0).max(1),

  // Metadata
  inferenceTimeMs: z.number(),
  modelVersion: z.string(),
});

export type LightGBMOutput = z.infer<typeof lightgbmOutputSchema>;

// ============================================
// MODEL 2: TFT (Temporal Fusion Transformer)
// ============================================

// Time-series input (T timesteps × F features)
export const tftInputSchema = z.object({
  // Windowed sequence (e.g., last 60 timesteps)
  sequence: z.array(
    z.object({
      timestamp: z.number(),
      indexReturn: z.number(),
      indexRealizedVol: z.number(),
      breadthScore: z.number(),
      futReturn: z.number(),
      futVolume: z.number(),
      atmIv: z.number(),
      ivChange: z.number(),
    })
  ),

  // Context (static for this prediction)
  dayOfWeek: z.number(),
  minutesFromOpen: z.number(),
});

export type TFTInput = z.infer<typeof tftInputSchema>;

export const tftOutputSchema = z.object({
  expectedHigh: z.number(),
  expectedLow: z.number(),
  expectedRange: z.number(),
  regime: z.enum(["trend", "range", "chop"]),
  confidence: z.number().min(0).max(1),

  // Metadata
  inferenceTimeMs: z.number(),
  modelVersion: z.string(),
});

export type TFTOutput = z.infer<typeof tftOutputSchema>;

// ============================================
// MODEL 3: LiT (Limit Order Book Transformer)
// ============================================

// RAW LOB (NO AGGREGATION)
export const litInputSchema = z.object({
  // Sequence of LOB snapshots (e.g., last 100 snapshots at 100ms intervals)
  lobSequence: z.array(
    z.object({
      timestamp: z.number(),

      // 20 bid levels (price, quantity)
      bids: z
        .array(
          z.object({
            price: z.number(),
            quantity: z.number(),
          })
        )
        .length(20),

      // 20 ask levels
      asks: z
        .array(
          z.object({
            price: z.number(),
            quantity: z.number(),
          })
        )
        .length(20),
    })
  ),
});

export type LiTInput = z.infer<typeof litInputSchema>;

export const litOutputSchema = z.object({
  microUpProb: z.number().min(0).max(1),
  microDownProb: z.number().min(0).max(1),
  microFlatProb: z.number().min(0).max(1),

  // Metadata
  inferenceTimeMs: z.number(),
  modelVersion: z.string(),
});

export type LiTOutput = z.infer<typeof litOutputSchema>;

// ============================================
// MODEL 4: Meta-Learner (Signal Fusion)
// ============================================

export const metaLearnerInputSchema = z.object({
  // Model outputs
  lightgbmProbs: lightgbmOutputSchema,
  tftRegime: tftOutputSchema,
  litMicroProbs: litOutputSchema,

  // Current state
  volatilityState: z.object({
    atmIv: z.number(),
    ivSkew: z.number(),
    indiaVix: z.number(),
  }),
});

export type MetaLearnerInput = z.infer<typeof metaLearnerInputSchema>;

export const metaLearnerOutputSchema = z.object({
  finalDirection: z.enum(["bullish", "bearish", "neutral"]),
  confidenceScore: z.number().min(0).max(1),
  tradeAllowed: z.boolean(),
  reason: z.string(), // Human-readable explanation

  // Metadata
  inferenceTimeMs: z.number(),
  modelVersion: z.string(),
});

export type MetaLearnerOutput = z.infer<typeof metaLearnerOutputSchema>;

// ============================================
// MODEL 5: Strike & Position Selector (Deterministic)
// ============================================

export const strikeSelectorInputSchema = z.object({
  // Account state
  availableBalance: z.number(),
  riskPerTrade: z.number(), // Max loss allowed (e.g., 2% of capital)

  // Market expectation
  expectedMove: z.number(), // From TFT
  direction: z.enum(["bullish", "bearish"]),

  // Option chain
  optionChain: z.array(
    z.object({
      strikePrice: z.number(),
      optionType: z.enum(["CE", "PE"]),
      ltp: z.number(),
      delta: z.number(),
      gamma: z.number(),
      iv: z.number(),
      bid: z.number(),
      ask: z.number(),
    })
  ),

  // Greeks constraints
  maxDelta: z.number().optional(),
  minGamma: z.number().optional(),
});

export type StrikeSelectorInput = z.infer<typeof strikeSelectorInputSchema>;

export const strikeSelectorOutputSchema = z.object({
  selectedStrike: z.number(),
  optionType: z.enum(["CE", "PE"]),
  lotCount: z.number(),
  expectedRR: z.number(), // Reward / Risk ratio

  // Greeks exposure
  netDelta: z.number(),
  netGamma: z.number(),

  // Cost
  totalCost: z.number(),
  maxLoss: z.number(),

  // Metadata
  computationTimeMs: z.number(),
});

export type StrikeSelectorOutput = z.infer<typeof strikeSelectorOutputSchema>;

// ============================================
// MODEL 6: PPO Execution Agent (RL)
// ============================================

export const ppoExecutionInputSchema = z.object({
  // Option LOB (selected strike)
  optionLob: z.object({
    bids: z.array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    ),
    asks: z.array(
      z.object({
        price: z.number(),
        quantity: z.number(),
      })
    ),
    ltp: z.number(),
    spread: z.number(),
  }),

  // Future LOB (for context)
  futureLob: z.object({
    ltp: z.number(),
    bidAskSpread: z.number(),
    lobImbalance: z.number(),
  }),

  // Order state
  remainingQty: z.number(),
  timeToExpiry: z.number(), // Seconds until option expiry
  urgency: z.number().min(0).max(1), // How urgent is execution (0 = passive, 1 = aggressive)
});

export type PPOExecutionInput = z.infer<typeof ppoExecutionInputSchema>;

export const ppoExecutionOutputSchema = z.object({
  limitPriceOffset: z.number(), // Offset from mid-price (-ve = aggressive, +ve = passive)
  sliceQty: z.number(), // How much to execute now
  waitOrExecute: z.enum(["wait", "execute"]),

  // Metadata
  inferenceTimeMs: z.number(),
  modelVersion: z.string(),
});

export type PPOExecutionOutput = z.infer<typeof ppoExecutionOutputSchema>;

// ============================================
// MODEL 7: Exit & Position Manager
// ============================================

export const exitManagerInputSchema = z.object({
  // Current position
  position: z.object({
    strikePrice: z.number(),
    optionType: z.enum(["CE", "PE"]),
    quantity: z.number(),
    entryPrice: z.number(),
    currentPrice: z.number(),
    unrealizedPnl: z.number(),
    unrealizedPnlPct: z.number(),
    positionDuration: z.number(), // Seconds
  }),

  // Updated model signals
  lightgbmProbs: lightgbmOutputSchema,
  litExhaustionSignal: z.number().min(-1).max(1), // -1 = bear exhaustion, +1 = bull exhaustion
  tftRegimeChange: z.boolean(),

  // Greeks decay
  greekDecay: z.object({
    currentDelta: z.number(),
    currentGamma: z.number(),
    currentTheta: z.number(),
    thetaDecayPerHour: z.number(),
  }),

  // Exit liquidity
  exitLiquidity: z.object({
    bidQty: z.number(),
    askQty: z.number(),
    spread: z.number(),
  }),
});

export type ExitManagerInput = z.infer<typeof exitManagerInputSchema>;

export const exitManagerOutputSchema = z.object({
  action: z.enum(["hold", "partial_exit", "full_exit", "reverse"]),
  exitQty: z.number().optional(),
  reason: z.string(),

  // If reverse
  newDirection: z.enum(["bullish", "bearish"]).optional(),

  // Metadata
  computationTimeMs: z.number(),
});

export type ExitManagerOutput = z.infer<typeof exitManagerOutputSchema>;
