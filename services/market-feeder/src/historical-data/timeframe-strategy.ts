/**
 * Multi-Timeframe Historical Data Fetching Strategy
 * Optimizes data retrieval based on Upstox API limits
 */

/**
 * Upstox API Historical Data Limits
 * Source: Upstox API Documentation (2024-2025)
 */
export interface TimeframeLimits {
  /** Candle interval (e.g., '1', '5', '60') */
  interval: number;

  /** Time unit */
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

  /** Maximum retrieval period */
  maxPeriod: {
    value: number;
    unit: 'month' | 'quarter' | 'decade' | 'unlimited';
  };

  /** Data availability start date */
  availableFrom: Date;
}

export const UPSTOX_LIMITS: TimeframeLimits[] = [
  // Minutes: 1-15 minutes -> 1 month limit
  {
    interval: 1,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 2,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 3,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 5,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 10,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 15,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'month' },
    availableFrom: new Date('2022-01-01'),
  },

  // Minutes: 16-300 minutes -> 1 quarter limit
  {
    interval: 30,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'quarter' },
    availableFrom: new Date('2022-01-01'),
  },
  {
    interval: 60,
    unit: 'minutes',
    maxPeriod: { value: 1, unit: 'quarter' },
    availableFrom: new Date('2022-01-01'),
  },

  // Hours: 1-5 hours -> 1 quarter limit
  {
    interval: 1,
    unit: 'hours',
    maxPeriod: { value: 1, unit: 'quarter' },
    availableFrom: new Date('2022-01-01'),
  },

  // Days: 1 day -> 1 decade limit
  {
    interval: 1,
    unit: 'days',
    maxPeriod: { value: 1, unit: 'decade' },
    availableFrom: new Date('2000-01-01'),
  },

  // Weeks: 1 week -> unlimited
  {
    interval: 1,
    unit: 'weeks',
    maxPeriod: { value: 0, unit: 'unlimited' },
    availableFrom: new Date('2000-01-01'),
  },

  // Months: 1 month -> unlimited
  {
    interval: 1,
    unit: 'months',
    maxPeriod: { value: 0, unit: 'unlimited' },
    availableFrom: new Date('2000-01-01'),
  },
];

/**
 * Timeframe fetch plan for a specific date range
 */
export interface TimeframePlan {
  /** Time period to fetch */
  startDate: Date;
  endDate: Date;

  /** Candle interval */
  interval: number;

  /** Time unit */
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

  /** Human-readable label */
  label: string;

  /** Estimated candles */
  estimatedCandles: number;
}

/**
 * Generate optimal multi-timeframe fetch plan
 * Maximizes data granularity while respecting API limits
 *
 * Strategy:
 * 1. Most recent data: Use smallest timeframe (1m, 5m) within 1-month limit
 * 2. Mid-term data: Use hourly/30m within 1-quarter limit
 * 3. Long-term data: Use daily within 10-year limit
 * 4. Historical data: Use weekly/monthly for pre-2022 data
 *
 * @param targetDate - The date to fetch data up to (usually today)
 * @param earliestDate - The earliest date to fetch (optional, defaults to 2000-01-01)
 * @returns Array of timeframe plans, ordered by priority (most granular first)
 */
export function generateFetchPlan(
  targetDate: Date = new Date(),
  earliestDate: Date = new Date('2000-01-01'),
): TimeframePlan[] {
  const plans: TimeframePlan[] = [];
  const now = targetDate;

  // Phase 1: Recent data (1 month) - 1-minute candles
  const oneMonthAgo = addMonths(now, -1);
  if (oneMonthAgo >= new Date('2022-01-01')) {
    plans.push({
      startDate: oneMonthAgo,
      endDate: now,
      interval: 1,
      unit: 'minutes',
      label: '1m candles (recent 1 month)',
      estimatedCandles: 30 * 6.5 * 60, // 30 days × 6.5 hours × 60 minutes = 11,700
    });
  }

  // Phase 2: Mid-term data (1-3 months) - 5-minute candles
  const threeMonthsAgo = addMonths(now, -3);
  if (threeMonthsAgo >= new Date('2022-01-01')) {
    const startDate =
      threeMonthsAgo > oneMonthAgo ? threeMonthsAgo : oneMonthAgo;
    plans.push({
      startDate,
      endDate: oneMonthAgo,
      interval: 5,
      unit: 'minutes',
      label: '5m candles (1-3 months)',
      estimatedCandles: 60 * 6.5 * 12, // 60 days × 6.5 hours × 12 (5m intervals) = 4,680
    });
  }

  // Phase 3: Quarter data (3+ months to 1 quarter) - 30-minute candles
  const oneQuarterAgo = addMonths(now, -3);
  if (oneQuarterAgo >= new Date('2022-01-01')) {
    const startDate =
      oneQuarterAgo > threeMonthsAgo ? oneQuarterAgo : threeMonthsAgo;
    plans.push({
      startDate,
      endDate: threeMonthsAgo,
      interval: 30,
      unit: 'minutes',
      label: '30m candles (3 months to 1 quarter)',
      estimatedCandles: 30 * 6.5 * 13, // 30 days × 6.5 hours × 13 (30m intervals) = 2,535
    });
  }

  // Phase 4: 2022-2024 data (1 quarter to 3 years) - 1-hour candles
  const threeYearsAgo = addYears(now, -3);
  const jan2022 = new Date('2022-01-01');
  if (threeYearsAgo < jan2022) {
    plans.push({
      startDate: jan2022,
      endDate: oneQuarterAgo,
      interval: 1,
      unit: 'hours',
      label: '1h candles (Jan 2022 to 1 quarter ago)',
      estimatedCandles: differenceInMonths(oneQuarterAgo, jan2022) * 20 * 6.5, // months × trading days × 6.5 hours
    });
  } else if (threeYearsAgo >= jan2022) {
    plans.push({
      startDate: threeYearsAgo,
      endDate: oneQuarterAgo,
      interval: 1,
      unit: 'hours',
      label: '1h candles (3 years to 1 quarter)',
      estimatedCandles:
        differenceInMonths(oneQuarterAgo, threeYearsAgo) * 20 * 6.5,
    });
  }

  // Phase 5: Historical data (2000-2022) - Daily candles
  const tenYearsAgo = addYears(now, -10);
  const startYear2000 = new Date('2000-01-01');
  const dailyStartDate =
    tenYearsAgo < startYear2000 ? startYear2000 : tenYearsAgo;

  if (dailyStartDate < jan2022) {
    plans.push({
      startDate: dailyStartDate,
      endDate: jan2022,
      interval: 1,
      unit: 'days',
      label: 'Daily candles (2000-2022)',
      estimatedCandles: differenceInYears(jan2022, dailyStartDate) * 250, // years × trading days
    });
  }

  // Phase 6: Very old data (pre-10 years) - Weekly candles
  if (earliestDate < tenYearsAgo && earliestDate < jan2022) {
    const weeklyEndDate = tenYearsAgo < jan2022 ? tenYearsAgo : jan2022;
    plans.push({
      startDate: earliestDate,
      endDate: weeklyEndDate,
      interval: 1,
      unit: 'weeks',
      label: 'Weekly candles (pre-10 years)',
      estimatedCandles: differenceInYears(weeklyEndDate, earliestDate) * 52, // years × weeks
    });
  }

  return plans.filter((p) => p.startDate < p.endDate); // Remove invalid ranges
}

/**
 * Calculate estimated total candles for a fetch plan
 */
export function estimateTotalCandles(plans: TimeframePlan[]): number {
  return plans.reduce((sum, plan) => sum + plan.estimatedCandles, 0);
}

/**
 * Calculate storage requirements
 * Assumptions:
 * - 1 candle = ~80 bytes in QuestDB (compressed)
 * - 1 instrument × full plan ≈ 20K candles ≈ 1.6 MB
 */
export function estimateStorageSize(plans: TimeframePlan[]): {
  totalCandles: number;
  sizeBytes: number;
  sizeMB: number;
  sizeGB: number;
} {
  const totalCandles = estimateTotalCandles(plans);
  const sizeBytes = totalCandles * 80; // 80 bytes per candle (SYMBOL compression)

  return {
    totalCandles,
    sizeBytes,
    sizeMB: sizeBytes / (1024 * 1024),
    sizeGB: sizeBytes / (1024 * 1024 * 1024),
  };
}

/**
 * Human-readable summary of fetch plan
 */
export function summarizePlan(plans: TimeframePlan[]): string {
  const storage = estimateStorageSize(plans);

  return `
Multi-Timeframe Fetch Plan:
${plans.map((p, i) => `  ${i + 1}. ${p.label}: ${p.startDate.toLocaleDateString()} to ${p.endDate.toLocaleDateString()} (~${p.estimatedCandles.toLocaleString()} candles)`).join('\n')}

Total Estimated Candles: ${storage.totalCandles.toLocaleString()}
Total Storage Size: ${storage.sizeMB.toFixed(2)} MB (${storage.sizeGB.toFixed(4)} GB)
`;
}
/**
 * Date arithmetic helpers (simple implementation without dependencies)
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function differenceInMonths(laterDate: Date, earlierDate: Date): number {
  const months = (laterDate.getFullYear() - earlierDate.getFullYear()) * 12;
  return months + (laterDate.getMonth() - earlierDate.getMonth());
}

function differenceInYears(laterDate: Date, earlierDate: Date): number {
  return laterDate.getFullYear() - earlierDate.getFullYear();
}
