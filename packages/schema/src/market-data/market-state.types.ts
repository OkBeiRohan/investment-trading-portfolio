/**
 * Market State Encoder (MSE) Output Types
 * Compressed, model-ready state representation
 *
 * NO ZOD - Internal use only
 */

// ============================================
// MSE Component States
// ============================================

export interface MacroState {
  // Breadth indicators (50 stocks → 6 numbers)
  pctStocksAboveVwap: number; // 0.0 to 1.0
  pctStocksAboveEma20: number;
  weightedReturnTop10: number;
  advanceDeclineRatio: number;
  breadthMomentum5m: number;
  breadthVolatility: number;
}

export interface MicroState {
  // NIFTY Future microstructure
  futPriceVsVwap: number;
  futRangePosition: number;
  futReturn1m: number;
  futReturn5m: number;
  futAtrPercent: number;
  futVolumeZscore: number;
  futOiChange: number;
}

export interface VolatilityState {
  // ATM IV
  atmIv: number;
  atmIvChange: number;

  // IV Skew
  ivSkew: number;

  // Greeks
  gammaAtm: number;
  vegaAtm: number;
  thetaAtm: number;

  // Put-Call Ratios
  pcrOi: number;
  pcrVolume: number;

  // Max Pain
  maxPainDistance: number;

  // Context
  indiaVix: number;
  realizedVol5m: number;
  volExpansionRatio: number;
}

export interface ExecutionState {
  // Future LOB
  futBidAskSpread: number;
  futBidAskSpreadBps: number;
  futLobImbalance: number;
  futLobDepth: number;

  // Option LOB (for selected strike)
  optionBidAskSpread?: number;
  optionBidAskSpreadPct?: number;
  optionLobImbalance?: number;
}

export interface PortfolioState {
  hasPosition: boolean;
  positionType: "long" | "short" | "none";
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  positionDuration: number; // Seconds

  // Greeks exposure
  netDelta?: number;
  netGamma?: number;
  netTheta?: number;
}

/**
 * Complete Market State (MSE Output)
 * This is what gets stored to QuestDB and fed to models
 */
export interface MarketState {
  timestamp: number;

  // 5 state components
  macroState: MacroState;
  microState: MicroState;
  volatilityState: VolatilityState;
  executionState: ExecutionState;
  portfolioState: PortfolioState;

  // Time context
  minutesFromOpen: number;
  minutesToClose: number;
  dayOfWeek: number; // 0-6, 0 = Monday
}

/**
 * MSE Metadata (quality checks)
 */
export interface MSEMetadata {
  computationTimeMs: number;
  missingDataFields: string[];
  dataQuality: "high" | "medium" | "low";
  stallDetected: boolean;
}

export interface MarketStateWithMetadata {
  state: MarketState;
  metadata: MSEMetadata;
}
