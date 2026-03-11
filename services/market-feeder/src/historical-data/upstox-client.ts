/**
 * Simple Upstox Historical Data Client
 * Fetches historical candles using Upstox V3 API
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CandlesRepository } from '@repo/database';
import { isAxiosError } from 'axios';

export interface UpstoxCandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  open_interest: number | null;
}

export interface UpstoxHistoricalResponse {
  status: string;
  data: {
    candles: [
      timestamp: string,
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number | null,
      open_interest: number | null,
    ][];
  };
}

export interface UpstoxMarketQuoteResponse {
  status: string;
  data: {
    [instrumentId: `${string}:${string}`]: {
      ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
      };
      depth: {
        buy: Array<{ quantity: number; price: number; orders: number }>;
        sell: Array<{ quantity: number; price: number; orders: number }>;
      };
      timestamp: string;
      instrument_token: `${
        | 'NSE_EQ'
        | 'NSE_INDEX'
        | 'NSE_FO'
        | 'NCD_FO'
        | 'BSE_EQ'
        | 'BSE_INDEX'
        | 'BSE_FO'
        | 'BCD_FO'
        | 'MCX_FO'
        | 'MCX_COM'}|${string}`;
      symbol: string;
      last_price: number;
      volume?: number;
      average_price?: number;
      oi?: number;
      net_change: number;
      total_buy_quantity?: number;
      total_sell_quantity?: number;
      lower_circuit_limit?: number;
      upper_circuit_limit?: number;
      last_trade_time?: string;
      oi_day_high?: number;
      oi_day_low?: number;
    };
  };
}

export interface InstrumentMasterData {
  instrumentKey: `${string}|${string}`;
  exchange: 'NSE' | 'BSE' | 'MCX';
  segment: 'INDEX' | 'EQ' | 'FO' | 'COMMODITY';
  tradingSymbol: string;
  name: string;
  isin?: string;
  lastPrice?: number;
  lastUpdated: Date;
}

export interface ExpiriesResponse {
  status: string;
  data: `${string}-${string}-${string}`[]; // Array of expiry dates in YYYY-MM-DD format
}

export interface ExpiredFutureContract {
  name: string;
  segment:
    | 'NSE_EQ'
    | 'NSE_INDEX'
    | 'NSE_FO'
    | 'NCD_FO'
    | 'BSE_EQ'
    | 'BSE_INDEX'
    | 'BSE_FO'
    | 'BCD_FO'
    | 'MCX_FO'
    | 'MCX_COM';
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: `${string}-${string}-${string}`;
  instrument_key: `${string}|${string}`; // expired_instrument_key format: NSE_FO|54452|24-04-2025
  exchange_token: string;
  trading_symbol: `${string} ${number} ${'CE' | 'PE'} ${string}`; // <underlying_symbol> <strike_price> <CE/PE> <expiry_date in dd MMM yy>
  tick_size: number;
  lot_size: number;
  instrument_type: 'FUT';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type:
    | 'INDEX'
    | 'EQUITY'
    | 'COMMODITY'
    | 'CUR'
    | 'IRD'
    | 'COM'
    | null;
  underlying_symbol: string;
  minimum_lot: number;
}

export interface ExpiredOptionContract {
  name: string;
  segment:
    | 'NSE_EQ'
    | 'NSE_INDEX'
    | 'NSE_FO'
    | 'NCD_FO'
    | 'BSE_EQ'
    | 'BSE_INDEX'
    | 'BSE_FO'
    | 'BCD_FO'
    | 'MCX_FO'
    | 'MCX_COM';
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: `${string}-${string}-${string}`;
  instrument_key: `${string}|${string}`; // expired_instrument_key format: NSE_FO|54452|24-04-2025
  exchange_token: string;
  trading_symbol: `${string} ${number} ${'CE' | 'PE'} ${string}`; // <underlying_symbol> <strike_price> <CE/PE> <expiry_date in dd MMM yy>
  tick_size: number;
  lot_size: number;
  instrument_type: 'CE' | 'PE';
  freeze_quantity: number;
  underlying_key: `${string}|${string}`; // NSE_INDEX|Nifty 50
  underlying_type:
    | 'INDEX'
    | 'EQUITY'
    | 'COMMODITY'
    | 'CUR'
    | 'IRD'
    | 'COM'
    | null;
  underlying_symbol: string;
  strike_price: number;
  minimum_lot: number;
  weekly: boolean;
}

export interface ExpiredFutureContractsResponse {
  status: string;
  data: ExpiredFutureContract[];
}

export interface ExpiredOptionContractsResponse {
  status: string;
  data: ExpiredOptionContract[];
}

export interface ExpiredHistoricalCandleResponse extends UpstoxHistoricalResponse {
  data: {
    candles: [
      timestamp: string,
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number,
      open_interest: number,
    ][];
  };
}

// Active Option Contract from /v2/option/contract
export interface ActiveOptionContract {
  name: string;
  segment: 'NSE_FO' | 'BSE_FO' | 'MCX_FO' | 'NCD_FO' | 'BCD_FO';
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: string; // YYYY-MM-DD
  instrument_key: string;
  exchange_token: string;
  trading_symbol: string;
  tick_size: number;
  lot_size: number;
  instrument_type: 'CE' | 'PE';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type: 'INDEX' | 'EQUITY' | 'COM' | 'CUR' | 'IRD';
  underlying_symbol: string;
  strike_price: number;
  minimum_lot: number;
  weekly: boolean;
}

export interface OptionContractsResponse {
  status: string;
  data: ActiveOptionContract[];
}

// Active Future Contract - NOTE: Active futures are NOT available from Upstox API
// They must be inferred from hardcoded list (NIFTY50_FUTURES) or constructed from trading symbols
// This interface is used for internal representation only
export interface ActiveFutureContract {
  name: string;
  segment: 'NSE_FO' | 'BSE_FO' | 'MCX_FO';
  exchange: 'NSE' | 'BSE' | 'MCX';
  expiry: string; // YYYY-MM-DD
  instrument_key: string;
  exchange_token: string;
  trading_symbol: string;
  tick_size: number;
  lot_size: number;
  instrument_type: 'FUT';
  freeze_quantity: number;
  underlying_key: string;
  underlying_type: 'INDEX' | 'EQUITY' | 'COM' | 'CUR' | 'IRD';
  underlying_symbol: string;
  minimum_lot: number;
}

export interface FutureContractsResponse {
  status: string;
  data: ActiveFutureContract[];
}

// Option Chain from /v2/option/chain
export interface OptionChainMarketData {
  ltp: number;
  volume: number;
  oi: number;
  close_price: number;
  bid_price: number;
  bid_qty: number;
  ask_price: number;
  ask_qty: number;
  prev_oi: number;
}

export interface OptionChainGreeks {
  vega: number;
  theta: number;
  gamma: number;
  delta: number;
  iv: number;
  pop: number; // Probability of Profit
}

export interface OptionChainItem {
  expiry: string;
  pcr: number;
  strike_price: number;
  underlying_key: string;
  underlying_spot_price: number;
  call_options: {
    instrument_key: string;
    market_data: OptionChainMarketData;
    option_greeks: OptionChainGreeks;
  };
  put_options: {
    instrument_key: string;
    market_data: OptionChainMarketData;
    option_greeks: OptionChainGreeks;
  };
}

export interface OptionChainResponse {
  status: string;
  data: OptionChainItem[];
}

// Option Greeks from /v3/market-quote/option-greek
export interface OptionGreekQuote {
  last_price: number;
  instrument_token: string;
  ltq: number;
  volume: number;
  cp: number; // Close price
  iv: number;
  vega: number;
  gamma: number;
  theta: number;
  delta: number;
  oi: number;
}

export interface OptionGreeksResponse {
  status: string;
  data: {
    [instrumentId: string]: OptionGreekQuote;
  };
}

// User Fund and Margin from /v2/user/get-funds-and-margin
export interface FundMarginSegment {
  used_margin: number;
  payin_amount: number;
  span_margin: number;
  adhoc_margin: number;
  notional_cash: number;
  available_margin: number;
  exposure_margin: number;
}

export interface FundsAndMarginResponse {
  status: string;
  data: {
    equity: FundMarginSegment;
    commodity: FundMarginSegment;
  };
}

@Injectable()
export class UpstoxClient {
  private readonly logger = new Logger(UpstoxClient.name);

  constructor(
    private readonly api: HttpService,
    private readonly candlesRepository: CandlesRepository,
  ) {}

  /**
   * Fetch historical candle data using V3 API
   * @param instrumentKey - e.g., 'NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018' (ISIN format)
   * @param unit - 'minutes', 'hours', 'days', 'weeks', 'months'
   * @param interval - For minutes: 1-300, hours: 1-5, days/weeks/months: 1
   * @param fromDate - ISO date string (YYYY-MM-DD)
   * @param toDate - ISO date string (YYYY-MM-DD)
   */
  async getHistoricalCandles(
    instrumentKey: string,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    interval: number,
    fromDate: string,
    toDate: string,
  ): Promise<UpstoxCandleData[]> {
    try {
      // V3 API endpoint: /v3/historical-candle/:instrument_key/:unit/:interval/:to_date/:from_date
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<UpstoxHistoricalResponse>(
          `/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}/${fromDate}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.candles) {
        throw new Error(`Failed to fetch candles for ${instrumentKey}`);
      } else {
        this.logger.log(
          `Fetched ${response.data.data.candles.length} candles for ${instrumentKey} (${unit}/${interval}) from ${fromDate} to ${toDate}`,
        );
      }

      // Transform array format to object format
      return response.data.data.candles.map((candle) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        open_interest: candle[6],
      }));
    } catch (error) {
      if (isAxiosError(error)) {
        this.logger.error(
          `Axios error fetching candles for ${instrumentKey}: ${
            error.response
              ? `Status ${error.response.status} - ${JSON.stringify(
                  error.response.data,
                )}`
              : error.message
          }`,
        );
        throw error;
      }

      // Log non-axios errors
      this.logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Fetch historical candles in batches based on V3 API constraints
   *
   * Data availability (from V3 API docs):
   * - minutes (1-300): Available from Jan 2022
   *   - 1-15 min intervals: Max 1 month per request
   *   - >15 min intervals: Max 1 quarter per request
   * - hours (1-5): Available from Jan 2022, max 1 quarter per request
   * - days: Available from Jan 2000, max 1 decade per request
   * - weeks/months: Available from Jan 2000, no limit
   *
   * For expired contracts (format: NSE_FO|TOKEN|DD-MM-YYYY), uses expired API
   *
   * @param instrumentKey - e.g., 'NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018', 'NSE_FO|54452|24-04-2025'
   * @param unit - 'minutes', 'hours', 'days', 'weeks', 'months'
   * @param interval - Interval value (1-300 for minutes, 1-5 for hours, 1 for others)
   * @param startDate - Start date (will be clamped to Jan 2022 for minutes/hours)
   * @param endDate - End date
   */
  async getHistoricalCandlesBatched(
    instrumentKey: string,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    interval: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UpstoxCandleData[]> {
    // Check if this is an expired futures contract (format: NSE_FO|TOKEN|DD-MM-YYYY)
    const isExpiredContract = instrumentKey.split('|').length === 3;

    if (isExpiredContract) {
      return this.getExpiredCandlesBatched(
        instrumentKey,
        unit,
        interval,
        startDate,
        endDate,
      );
    }

    // Regular instrument - use V3 API
    return this.getRegularCandlesBatched(
      instrumentKey,
      unit,
      interval,
      startDate,
      endDate,
    );
  }

  /**
   * Fetch historical candles for expired contracts using expired instruments API
   * Expired API only supports: 1minute, 3minute, 5minute, 15minute, 30minute, day
   */
  private async getExpiredCandlesBatched(
    expiredInstrumentKey: string,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    interval: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UpstoxCandleData[]> {
    // Map to expired API interval format
    let expiredInterval: '1minute' | '30minute' | 'day';
    if (unit === 'minutes') {
      if (interval === 1) expiredInterval = '1minute';
      else if (interval === 30) expiredInterval = '30minute';
      else {
        this.logger.warn(
          `Expired API doesn't support ${interval} minute interval, using 1minute`,
        );
        expiredInterval = '1minute';
      }
    } else if (unit === 'days') {
      expiredInterval = 'day';
    } else {
      this.logger.warn(
        `Expired API doesn't support ${unit} unit, using 1minute`,
      );
      expiredInterval = '1minute';
    }

    const allCandles: UpstoxCandleData[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (endDate > today) {
      endDate = today;
    }

    // For expired API, batch by month (no specific limit documented, being conservative)
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const batchEnd = new Date(currentDate);
      batchEnd.setMonth(batchEnd.getMonth() + 1);
      batchEnd.setDate(batchEnd.getDate() - 1);

      let actualEnd = batchEnd > endDate ? endDate : batchEnd;
      if (actualEnd > today) {
        actualEnd = today;
      }

      const fromDateStr = currentDate.toISOString().split('T')[0];
      const toDateStr = actualEnd.toISOString().split('T')[0];

      this.logger.log(
        `Fetching EXPIRED ${expiredInstrumentKey} (${expiredInterval}) from ${fromDateStr} to ${toDateStr}`,
      );

      const candles = await this.getExpiredHistoricalCandles(
        expiredInstrumentKey,
        expiredInterval,
        fromDateStr,
        toDateStr,
      );

      allCandles.push(...candles);

      // Insert directly to QuestDB after each batch
      if (candles.length > 0) {
        const candleInserts = candles.map((c) => ({
          timestamp: new Date(c.timestamp),
          instrumentKey: expiredInstrumentKey,
          intervalValue: interval,
          intervalUnit: 'minute' as const,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
          openInterest: c.open_interest || 0,
        }));

        const CHUNK_SIZE = 5000;
        for (let i = 0; i < candleInserts.length; i += CHUNK_SIZE) {
          const chunk = candleInserts.slice(i, i + CHUNK_SIZE);
          await this.candlesRepository.insertBatch(chunk);
          this.logger.debug(
            `Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} candles) for ${expiredInstrumentKey}`,
          );
        }
        this.logger.log(
          `✓ Inserted ${candleInserts.length} candles to QuestDB for ${expiredInstrumentKey}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      currentDate.setTime(actualEnd.getTime());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allCandles;
  }

  /**
   * Fetch historical candles for regular instruments using V3 API
   */
  private async getRegularCandlesBatched(
    instrumentKey: string,
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    interval: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UpstoxCandleData[]> {
    // Enforce data availability constraints
    const minDate = new Date('2022-01-01');
    if ((unit === 'minutes' || unit === 'hours') && startDate < minDate) {
      this.logger.warn(
        `Requested start date ${startDate.toISOString().split('T')[0]} is before Jan 2022. Clamping to 2022-01-01.`,
      );
      startDate = minDate;
    }

    // CRITICAL FIX: Clamp endDate to today to prevent 400 errors from requesting future data
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    if (endDate > today) {
      this.logger.warn(
        `Requested end date ${endDate.toISOString().split('T')[0]} is in the future. Clamping to today (${today.toISOString().split('T')[0]}).`,
      );
      endDate = today;
    }

    const allCandles: UpstoxCandleData[] = [];

    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let batchEnd: Date;

      // Calculate batch end based on API constraints (CALENDAR-BASED, not day count)
      if (unit === 'minutes' && interval <= 15) {
        // 1 calendar month for 1-15 min intervals
        batchEnd = new Date(currentDate);
        batchEnd.setMonth(batchEnd.getMonth() + 1);
        batchEnd.setDate(batchEnd.getDate() - 1); // Last day of the month
      } else if ((unit === 'minutes' && interval > 15) || unit === 'hours') {
        // 1 quarter (3 calendar months) for >15 min or hourly
        batchEnd = new Date(currentDate);
        batchEnd.setMonth(batchEnd.getMonth() + 3);
        batchEnd.setDate(batchEnd.getDate() - 1);
      } else if (unit === 'days') {
        // 1 decade (10 years)
        batchEnd = new Date(currentDate);
        batchEnd.setFullYear(batchEnd.getFullYear() + 10);
        batchEnd.setDate(batchEnd.getDate() - 1);
      } else {
        // weeks/months: no limit, use endDate
        batchEnd = new Date(endDate);
      }

      let actualEnd = batchEnd > endDate ? endDate : batchEnd;

      // CRITICAL: Also clamp actualEnd to today to prevent UDAPI1148 "Invalid date range" errors
      if (actualEnd > today) {
        this.logger.warn(
          `Batch end date ${actualEnd.toISOString().split('T')[0]} exceeds today. Clamping to ${today.toISOString().split('T')[0]}.`,
        );
        actualEnd = today;
      }

      const fromDateStr = currentDate.toISOString().split('T')[0];
      const toDateStr = actualEnd.toISOString().split('T')[0];

      this.logger.log(
        `Fetching ${instrumentKey} (${unit}/${interval}) from ${fromDateStr} to ${toDateStr}`,
      );

      const candles = await this.getHistoricalCandles(
        instrumentKey,
        unit,
        interval,
        fromDateStr,
        toDateStr,
      );

      allCandles.push(...candles);

      // DEMO VERSION: Insert directly to QuestDB after each batch
      if (candles.length > 0) {
        const candleInserts = candles.map((c) => ({
          timestamp: new Date(c.timestamp),
          instrumentKey,
          intervalValue: interval,
          intervalUnit:
            unit === 'minutes'
              ? ('minute' as const)
              : unit === 'hours'
                ? ('hour' as const)
                : unit === 'days'
                  ? ('day' as const)
                  : ('minute' as const),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
          openInterest: c.open_interest || 0,
        }));

        // Insert in chunks to avoid connection timeout
        const CHUNK_SIZE = 5000;
        for (let i = 0; i < candleInserts.length; i += CHUNK_SIZE) {
          const chunk = candleInserts.slice(i, i + CHUNK_SIZE);
          await this.candlesRepository.insertBatch(chunk);
          this.logger.debug(
            `Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} candles) for ${instrumentKey}`,
          );
        }
        this.logger.log(
          `✓ Inserted ${candleInserts.length} candles to QuestDB for ${instrumentKey}`,
        );
      }

      // Rate limiting: 250 requests/second, so wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Move to next batch start (1 day after current batch end)
      currentDate.setTime(actualEnd.getTime());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allCandles;
  }

  /**
   * Test method to fetch a single batch for debugging
   * @param instrumentKey - Instrument to test
   * @param daysBack - How many days back to fetch (default 7)
   */
  async testFetch(
    instrumentKey: string,
    daysBack: number = 7,
  ): Promise<{
    success: boolean;
    candleCount: number;
    error?: string;
    sampleCandle?: UpstoxCandleData;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      this.logger.log(
        `Testing fetch for ${instrumentKey} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      );

      const candles = await this.getHistoricalCandles(
        instrumentKey,
        'minutes',
        1,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      );

      return {
        success: true,
        candleCount: candles.length,
        sampleCandle: candles[0],
      };
    } catch (error) {
      return {
        success: false,
        candleCount: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fetch full market quote for instruments
   * @param instrumentKeys - Array of instrument keys (e.g., ['NSE_INDEX|Nifty 50', 'NSE_EQ|INE002A01018'])
   * @returns Market quote data for instruments
   */
  async getFullMarketQuote(
    instrumentKeys: string[],
  ): Promise<InstrumentMasterData[]> {
    try {
      // API endpoint: /v2/market-quote/quotes?instrument_key=KEY1&instrument_key=KEY2
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append('instrument_key', key));

      const response = await firstValueFrom(
        this.api.get<UpstoxMarketQuoteResponse>(
          `/v2/market-quote/quotes?${params.toString()}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch market quotes');
      }

      // Transform to InstrumentMasterData
      return Object.entries(response.data.data).map(([id, quote]) => {
        // Parse segment from instrument id (e.g. NSE_EQ:HDFCLIFE) or from instrument_token (e.g., NSE_EQ|INE002A01018 -> NSE_EQ)
        // For futures instrument id will be like: NSE_FO:NIFTY26JANFUT

        const [exchange, segment] = quote.instrument_token
          .split('|')[0]
          .split('_');
        const isin = quote.instrument_token.split('|')[1];
        const symbol = id.split(':')[1];

        return {
          instrumentKey: quote.instrument_token,
          exchange: exchange as 'NSE' | 'BSE' | 'MCX',
          segment: segment as 'INDEX' | 'EQ' | 'FO' | 'COMMODITY',
          tradingSymbol: quote.symbol || symbol,
          name: quote.symbol || symbol, // API doesn't provide full name, use symbol
          isin: isin,
          lastPrice: quote.last_price,
          lastUpdated: new Date(),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error fetching market quotes: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw error;
    }
  }

  /**
   * Get all expiries for an underlying instrument (e.g., NIFTY50)
   * Returns up to 6 months of historical expiries
   * @param instrumentKey - Underlying instrument key (e.g., 'NSE_INDEX|Nifty 50')
   * @returns Array of expiry dates in YYYY-MM-DD format
   */
  async getExpiries(instrumentKey: string): Promise<string[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<ExpiriesResponse>(
          `/v2/expired-instruments/expiries?instrument_key=${encodedKey}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch expiries');
      }

      this.logger.log(
        `Fetched ${response.data.data.length} expiries for ${instrumentKey}`,
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching expiries: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Get expired future contract for a specific expiry date
   * @param instrumentKey - Underlying instrument key (e.g., 'NSE_INDEX|Nifty 50')
   * @param expiryDate - Expiry date in YYYY-MM-DD format
   * @returns Expired future contract details
   */
  async getExpiredFutureContract(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredFutureContract[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<ExpiredFutureContractsResponse>(
          `/v2/expired-instruments/future/contract?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching expired future contract for ${expiryDate}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  async getExpiredOptionContract(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredOptionContract[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<ExpiredOptionContractsResponse>(
          `/v2/expired-instruments/option/contract?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching expired option contract for ${expiryDate}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  /**
   * Fetch historical candles for expired instruments
   * @param expiredInstrumentKey - Expired instrument key (e.g., 'NSE_FO|54452|24-04-2025')
   * @param interval - '1minute', '30minute', 'day', etc.
   * @param fromDate - Start date in YYYY-MM-DD format
   * @param toDate - End date in YYYY-MM-DD format
   * @returns Array of candle data
   */
  async getExpiredHistoricalCandles(
    expiredInstrumentKey: string,
    interval: '1minute' | '30minute' | 'day',
    fromDate: string,
    toDate: string,
  ): Promise<UpstoxCandleData[]> {
    try {
      const encodedKey = encodeURIComponent(expiredInstrumentKey);
      const response = await firstValueFrom(
        this.api.get<ExpiredHistoricalCandleResponse>(
          `/v2/expired-instruments/historical-candle/${encodedKey}/${interval}/${toDate}/${fromDate}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data?.candles) {
        throw new Error(
          `Failed to fetch expired candles for ${expiredInstrumentKey}`,
        );
      }

      this.logger.log(
        `Fetched ${response.data.data.candles.length} expired candles for ${expiredInstrumentKey} from ${fromDate} to ${toDate}`,
      );

      return response.data.data.candles.map((candle) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        open_interest: candle[6],
      }));
    } catch (error) {
      if (isAxiosError(error)) {
        this.logger.error(
          `Axios error fetching expired candles: ${
            error.response
              ? `Status ${error.response.status} - ${JSON.stringify(
                  error.response.data,
                )}`
              : error.message
          }`,
        );
        throw error;
      }
      this.logger.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Fetch market quotes in batches (max 500 per request)
   * @param instrumentKeys - Array of instrument keys
   * @returns All instrument master data
   */
  async getFullMarketQuoteBatched(
    instrumentKeys: string[],
  ): Promise<InstrumentMasterData[]> {
    const BATCH_SIZE = 500;
    const allData: InstrumentMasterData[] = [];

    for (let i = 0; i < instrumentKeys.length; i += BATCH_SIZE) {
      const batch = instrumentKeys.slice(i, i + BATCH_SIZE);
      this.logger.log(
        `Fetching market quotes batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} instruments)`,
      );

      const data = await this.getFullMarketQuote(batch);
      allData.push(...data);

      // Rate limiting
      if (i + BATCH_SIZE < instrumentKeys.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allData;
  }

  /**
   * Fetch active option contracts for an underlying
   * @param instrumentKey - Underlying instrument key (e.g., 'NSE_INDEX|Nifty 50')
   * @param expiryDate - Optional expiry date filter (YYYY-MM-DD)
   * @returns Array of active option contracts
   */
  async getActiveOptionContracts(
    instrumentKey: string,
    expiryDate?: string,
  ): Promise<ActiveOptionContract[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      let url = `/v2/option/contract?instrument_key=${encodedKey}`;
      if (expiryDate) {
        url += `&expiry_date=${expiryDate}`;
      }

      const response = await firstValueFrom(
        this.api.get<OptionContractsResponse>(url),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch option contracts');
      }

      this.logger.log(
        `Fetched ${response.data.data.length} option contracts for ${instrumentKey}${expiryDate ? ` expiry ${expiryDate}` : ''}`,
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching option contracts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Fetch option chain with greeks and market data
   * @param instrumentKey - Underlying instrument key (e.g., 'NSE_INDEX|Nifty 50')
   * @param expiryDate - Expiry date (YYYY-MM-DD)
   * @returns Option chain data with greeks
   */
  async getOptionChain(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<OptionChainItem[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<OptionChainResponse>(
          `/v2/option/chain?instrument_key=${encodedKey}&expiry_date=${expiryDate}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch option chain');
      }

      this.logger.log(
        `Fetched option chain with ${response.data.data.length} strikes for ${instrumentKey} expiry ${expiryDate}`,
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching option chain: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Fetch option greeks for multiple instrument keys
   * @param instrumentKeys - Array of option instrument keys
   * @returns Option greek data for each instrument
   */
  async getOptionGreeks(
    instrumentKeys: string[],
  ): Promise<Map<string, OptionGreekQuote>> {
    try {
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append('instrument_key', key));

      const response = await firstValueFrom(
        this.api.get<OptionGreeksResponse>(
          `/v3/market-quote/option-greek?${params.toString()}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch option greeks');
      }

      const result = new Map<string, OptionGreekQuote>();
      for (const [key, quote] of Object.entries(response.data.data)) {
        result.set(quote.instrument_token, quote);
      }

      this.logger.log(`Fetched option greeks for ${result.size} instruments`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching option greeks: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Get unique expiry dates from option contracts
   * @param instrumentKey - Underlying instrument key
   * @returns Array of expiry dates in YYYY-MM-DD format
   */
  async getActiveExpiries(instrumentKey: string): Promise<string[]> {
    try {
      const contracts = await this.getActiveOptionContracts(instrumentKey);
      const uniqueExpiries = [...new Set(contracts.map((c) => c.expiry))];
      uniqueExpiries.sort(); // Sort chronologically

      this.logger.log(
        `Found ${uniqueExpiries.length} active expiries for ${instrumentKey}`,
      );

      return uniqueExpiries;
    } catch (error) {
      this.logger.error(
        `Error fetching active expiries: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  /**
   * Fetch market quote with depth data preserved
   * @param instrumentKeys - Array of instrument keys
   * @returns Raw market quote response with depth data
   */
  async getMarketQuoteWithDepth(
    instrumentKeys: string[],
  ): Promise<UpstoxMarketQuoteResponse['data']> {
    try {
      const params = new URLSearchParams();
      instrumentKeys.forEach((key) => params.append('instrument_key', key));

      const response = await firstValueFrom(
        this.api.get<UpstoxMarketQuoteResponse>(
          `/v2/market-quote/quotes?${params.toString()}`,
        ),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch market quotes with depth');
      }

      return response.data.data;
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        this.logger.error(
          `Error fetching market quotes with depth: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        this.logger.error(
          `Request URL: ${error.config?.url}, Headers: ${JSON.stringify(error.config?.headers)}`,
        );
      } else {
        this.logger.error(
          `Error fetching market quotes with depth: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      throw error;
    }
  }

  /**
   * Get expired futures for a specific expiry date
   * @param instrumentKey - Underlying instrument key
   * @param expiryDate - Expiry date in YYYY-MM-DD format
   */
  async getExpiredFutures(
    instrumentKey: string,
    expiryDate: string,
  ): Promise<ExpiredFutureContract[]> {
    try {
      const encodedKey = encodeURIComponent(instrumentKey);
      const response = await firstValueFrom(
        this.api.get<ExpiredFutureContractsResponse>(
          `/v2/expired-instruments/futures?instrument_key=${encodedKey}&expiry=${expiryDate}`,
        ),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Failed to fetch expired futures for ${expiryDate}`);
      }

      return response.data.data || [];
    } catch (error) {
      this.logger.error(
        `Error fetching expired futures: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  /**
   * Fetch user funds and margin data
   * @param segment - Optional segment filter: 'SEC' for Equity, 'COM' for Commodity
   * @returns Fund and margin data for equity and commodity segments
   */
  async getFundsAndMargin(
    segment?: 'SEC' | 'COM',
  ): Promise<FundsAndMarginResponse['data']> {
    try {
      let url = '/v2/user/get-funds-and-margin';
      if (segment) {
        url += `?segment=${segment}`;
      }

      const response = await firstValueFrom(
        this.api.get<FundsAndMarginResponse>(url),
      );

      if (response.data.status !== 'success' || !response.data.data) {
        throw new Error('Failed to fetch funds and margin');
      }

      this.logger.log(
        `Fetched funds - Available margin: ₹${response.data.data.equity.available_margin.toLocaleString()}`,
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Error fetching funds and margin: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
