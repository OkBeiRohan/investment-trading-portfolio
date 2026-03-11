/**
 * Upstox Historical & Instrument DTOs
 * Request/Response types for V3 Historical Candle + Expired Instruments APIs
 */

// ═══════════════════════════════════════════════════════
// Historical Candle DTOs
// ═══════════════════════════════════════════════════════

export interface HistoricalCandleRequest {
  instrument_key: string;
  interval: string; // '1', '3', '5', '15', '30' (minutes) or '1' (hour/day/week/month)
  unit: "minutes" | "hours" | "days" | "weeks" | "months";
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
}

export interface IntradayCandleRequest {
  instrument_key: string;
  interval: string;
  unit: "minutes" | "hours" | "days";
}

export interface CandleResponse {
  status: string;
  data: {
    candles: Array<
      [
        string, // timestamp
        number, // open
        number, // high
        number, // low
        number, // close
        number, // volume
        number, // open_interest
      ]
    >;
  };
}

export interface ExpiredContractsRequest {
  symbol: string; // 'NIFTY', 'BANKNIFTY', etc.
  expiry_date: string; // YYYY-MM-DD
}

export interface ExpiredContractsResponse {
  status: string;
  data: Array<{
    instrument_key: string;
    name: string;
    exchange: string;
    trading_symbol: string;
  }>;
}

// ═══════════════════════════════════════════════════════
// V3 Expired Derivatives DTOs
// ═══════════════════════════════════════════════════════

export interface ExpiredInstrument {
  instrument_key: string;
  name: string;
  exchange: string;
  trading_symbol: string;
  expiry: string;
  lot_size: number;
  tick_size: number;
  instrument_type: string;
  exchange_token: string;
  underlying_key: string;
  underlying_symbol: string;
  underlying_type: string;
  freeze_quantity: number;
  minimum_lot: number;
  strike_price?: number;
  weekly?: boolean;
}

export interface ExpiredDerivativesResponse {
  status: string;
  data: ExpiredInstrument[];
}

// ═══════════════════════════════════════════════════════
// V3 Option Chain DTOs
// ═══════════════════════════════════════════════════════

export interface ActiveOptionContract {
  instrument_key: string;
  name: string;
  exchange: string;
  trading_symbol: string;
  expiry: string;
  lot_size: number;
  tick_size: number;
  instrument_type: string; // 'CE' | 'PE'
  exchange_token: string;
  underlying_key: string;
  underlying_symbol: string;
  underlying_type: string;
  freeze_quantity: number;
  minimum_lot: number;
  strike_price: number;
  weekly?: boolean;
}

export interface ActiveOptionContractsResponse {
  status: string;
  data: ActiveOptionContract[];
}

export interface ExpiryDatesResponse {
  status: string;
  data: string[]; // Array of expiry dates in YYYY-MM-DD format
}

export interface OptionChainStrike {
  underlying_key: string;
  strike_price: number;
  call_options?: {
    instrument_key: string;
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      bid_price: number;
      bid_qty: number;
      ask_price: number;
      ask_qty: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      pop: number;
    };
  };
  put_options?: {
    instrument_key: string;
    market_data: {
      ltp: number;
      volume: number;
      oi: number;
      bid_price: number;
      bid_qty: number;
      ask_price: number;
      ask_qty: number;
    };
    option_greeks: {
      iv: number;
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      pop: number;
    };
  };
}

export interface OptionChainResponse {
  status: string;
  data: OptionChainStrike[];
}

// ═══════════════════════════════════════════════════════
// Common Candle Data Type
// ═══════════════════════════════════════════════════════

export interface UpstoxCandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number;
}

/**
 * Parse raw candle array from API response into typed object
 */
export function parseCandleArray(
  raw: [string, number, number, number, number, number, number],
): UpstoxCandleData {
  return {
    timestamp: raw[0],
    open: raw[1],
    high: raw[2],
    low: raw[3],
    close: raw[4],
    volume: raw[5],
    openInterest: raw[6],
  };
}
