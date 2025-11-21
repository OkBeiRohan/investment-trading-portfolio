import { ValidationError } from "../core/error";

export interface ParsedInstrument {
  exchange: string;
  segment: string;
  symbol: string;
  instrumentType?: "EQ" | "FUT" | "OPT" | "INDEX";
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
}

/**
 * Parse Upstox instrument key
 * Format: EXCHANGE_SEGMENT|SYMBOL or EXCHANGE_SEGMENT|SYMBOL-EXPIRY-STRIKE-TYPE
 * Examples:
 * - NSE_EQ|INE669E01016 (Equity)
 * - NSE_INDEX|Nifty 50 (Index)
 * - NSE_FO|NIFTY24DEC19000CE (Options)
 * - NSE_FO|NIFTY24DECFUT (Futures)
 */
export function parseInstrumentKey(instrumentKey: string): ParsedInstrument {
  if (!instrumentKey || typeof instrumentKey !== "string") {
    throw new ValidationError("Invalid instrument key format");
  }

  const [exchangeSegment, symbolPart] = instrumentKey.split("|");
  if (!exchangeSegment || !symbolPart) {
    throw new ValidationError(
      "Invalid instrument key format: missing exchange or symbol"
    );
  }

  const [exchange, segment] = exchangeSegment.split("_");

  const result: ParsedInstrument = {
    exchange,
    segment,
    symbol: symbolPart,
  };

  // Determine instrument type
  if (segment === "EQ") {
    result.instrumentType = "EQ";
  } else if (segment === "INDEX") {
    result.instrumentType = "INDEX";
  } else if (segment === "FO") {
    // Parse futures/options format
    const optionMatch = symbolPart.match(
      /^(.+?)(\d{2}[A-Z]{3}\d{2})(\d+)(CE|PE)$/
    );
    const futureMatch = symbolPart.match(/^(.+?)(\d{2}[A-Z]{3}\d{2})FUT$/);

    if (optionMatch) {
      result.instrumentType = "OPT";
      result.symbol = optionMatch[1];
      result.expiry = optionMatch[2];
      result.strike = parseInt(optionMatch[3]);
      result.optionType = optionMatch[4] as "CE" | "PE";
    } else if (futureMatch) {
      result.instrumentType = "FUT";
      result.symbol = futureMatch[1];
      result.expiry = futureMatch[2];
    }
  }

  return result;
}

/**
 * Build instrument key from components
 */
export function buildInstrumentKey(parsed: ParsedInstrument): string {
  const exchangeSegment = `${parsed.exchange}_${parsed.segment}`;

  if (
    parsed.instrumentType === "OPT" &&
    parsed.expiry &&
    parsed.strike &&
    parsed.optionType
  ) {
    return `${exchangeSegment}|${parsed.symbol}${parsed.expiry}${parsed.strike}${parsed.optionType}`;
  }

  if (parsed.instrumentType === "FUT" && parsed.expiry) {
    return `${exchangeSegment}|${parsed.symbol}${parsed.expiry}FUT`;
  }

  return `${exchangeSegment}|${parsed.symbol}`;
}

/**
 * Check if instrument is an option
 */
export function isOption(instrumentKey: string): boolean {
  try {
    const parsed = parseInstrumentKey(instrumentKey);
    return parsed.instrumentType === "OPT";
  } catch {
    return false;
  }
}

/**
 * Check if instrument is a future
 */
export function isFuture(instrumentKey: string): boolean {
  try {
    const parsed = parseInstrumentKey(instrumentKey);
    return parsed.instrumentType === "FUT";
  } catch {
    return false;
  }
}

/**
 * Check if instrument is an index
 */
export function isIndex(instrumentKey: string): boolean {
  try {
    const parsed = parseInstrumentKey(instrumentKey);
    return parsed.instrumentType === "INDEX";
  } catch {
    return false;
  }
}

/**
 * Get exchange from instrument key
 */
export function getExchange(instrumentKey: string): string {
  const parsed = parseInstrumentKey(instrumentKey);
  return parsed.exchange;
}

/**
 * Get symbol from instrument key
 */
export function getSymbol(instrumentKey: string): string {
  const parsed = parseInstrumentKey(instrumentKey);
  return parsed.symbol;
}
