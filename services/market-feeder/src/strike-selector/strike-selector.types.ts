/**
 * Strike Selector Types
 * Institutional-grade option strike selection using RAROC-based utility function
 */

import type { OptionChainItem } from '../historical-data/upstox-client';

// ============================================
// Input Types
// ============================================

export interface StrikeSelectorConfig {
  /** Maximum percentage of capital to risk per trade (e.g., 0.05 = 5%) */
  maxRiskPercent: number;

  /** Expected market move in points (positive = bullish, negative = bearish) */
  expectedMove: number;

  /** Holding period in days (can be fractional, e.g., 0.5 = 12 hours) */
  holdingPeriodDays: number;

  /** Option type filter: 'CE' for calls, 'PE' for puts, 'BOTH' for all */
  optionType: 'CE' | 'PE' | 'BOTH';

  /** Minimum Delta threshold (0-1, filters out very far OTM options) */
  minDelta?: number;

  /** Maximum Delta threshold (0-1, filters out very deep ITM options) */
  maxDelta?: number;

  /** Minimum OI threshold (filters illiquid options) */
  minOpenInterest?: number;

  /** Minimum volume threshold (filters illiquid options) */
  minVolume?: number;

  /** Maximum IV percentile (filters overpriced options) */
  maxIV?: number;

  /** Minimum bid-ask spread ratio (liquidity filter) */
  maxBidAskSpreadPercent?: number;

  /** Number of top strikes to return */
  topN?: number;
}

export interface MarketContext {
  /** Current Nifty spot price */
  spotPrice: number;

  /** Current India VIX value */
  vix: number;

  /** Option chain data with greeks */
  optionChain: OptionChainItem[];

  /** Available trading balance (from funds API) */
  availableBalance: number;

  /** Expiry date of options */
  expiryDate: string;
}

// ============================================
// Output Types
// ============================================

export interface StrikeAnalysis {
  /** Strike price */
  strikePrice: number;

  /** Option type (CE/PE) */
  optionType: 'CE' | 'PE';

  /** Instrument key for order placement */
  instrumentKey: string;

  /** Current premium (LTP) */
  premium: number;

  /** Number of lots that can be bought with available capital */
  maxLots: number;

  /** Total capital required for maxLots */
  capitalRequired: number;

  /** Capital utilization percentage */
  capitalUtilizationPercent: number;

  // Greeks
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;

  // Market Data
  volume: number;
  openInterest: number;
  bidPrice: number;
  askPrice: number;
  bidAskSpread: number;
  bidAskSpreadPercent: number;

  // Utility Score Components
  /** Projected P&L based on expected move */
  projectedPnL: number;

  /** Time decay cost over holding period */
  thetaCost: number;

  /** Delta-adjusted expected move */
  deltaAdjustedMove: number;

  /** Gamma bonus (acceleration factor) */
  gammaBonus: number;

  /** Volatility risk factor */
  volatilityRisk: number;

  /** Capital preservation multiplier */
  capitalPreservationFactor: number;

  /** Final utility score (U(S)) */
  utilityScore: number;

  /** Rank (1 = best) */
  rank: number;

  /** Reason if strike was filtered out */
  filterReason?: string;
}

export interface StrikeSelectorResult {
  /** Analysis timestamp */
  timestamp: Date;

  /** Market context summary */
  context: {
    spotPrice: number;
    vix: number;
    availableBalance: number;
    expiryDate: string;
    daysToExpiry: number;
  };

  /** Input configuration used */
  config: StrikeSelectorConfig;

  /** Best strike recommendation */
  recommended: StrikeAnalysis | null;

  /** All analyzed strikes (sorted by utility score) */
  allStrikes: StrikeAnalysis[];

  /** Filtered strikes with reasons */
  filteredStrikes: StrikeAnalysis[];

  /** Summary statistics */
  stats: {
    totalStrikesAnalyzed: number;
    strikesPassedFilter: number;
    avgUtilityScore: number;
    maxUtilityScore: number;
    avgIV: number;
    maxLotsPossible: number;
  };
}

// ============================================
// Constants
// ============================================

export const NIFTY50_LOT_SIZE = 65; // Updated Nifty 50 lot size

export const DEFAULT_CONFIG: Partial<StrikeSelectorConfig> = {
  maxRiskPercent: 0.05, // 5% max capital per trade
  holdingPeriodDays: 1, // Intraday by default
  optionType: 'BOTH',
  minDelta: 0.05, // Filter very far OTM
  maxDelta: 0.95, // Filter very deep ITM
  minOpenInterest: 1000,
  minVolume: 100,
  maxBidAskSpreadPercent: 2, // 2% max spread
  topN: 10,
};

// Instrument keys for market data
export const NIFTY50_INDEX_KEY = 'NSE_INDEX|Nifty 50';
export const INDIA_VIX_KEY = 'NSE_INDEX|India VIX';
