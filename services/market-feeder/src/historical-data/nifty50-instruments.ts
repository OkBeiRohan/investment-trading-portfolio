/**
 * NIFTY 50 Constituent Stocks
 * Updated as of January 2026
 *
 * Instrument Key Formats (Upstox V3 API):
 * - Equity: NSE_EQ|SYMBOL (e.g., 'NSE_EQ|RELIANCE')
 * - Index: NSE_INDEX|Name (e.g., 'NSE_INDEX|Nifty 50')
 * - Futures: NSE_FO|TOKEN|DD-MM-YYYY (e.g., 'NSE_FO|54452|24-04-2025')
 *
 * Note: V3 API also supports ISIN format for equities (e.g., 'NSE_EQ|INE002A01018')
 * but symbol format is more readable and equally valid.
 */

export const NIFTY50_CONSTITUENTS = [
  'NSE_EQ|RELIANCE',
  'NSE_EQ|TCS',
  'NSE_EQ|HDFCBANK',
  'NSE_EQ|INFY',
  'NSE_EQ|ICICIBANK',
  'NSE_EQ|HINDUNILVR',
  'NSE_EQ|ITC',
  'NSE_EQ|SBIN',
  'NSE_EQ|BHARTIARTL',
  'NSE_EQ|BAJFINANCE',
  'NSE_EQ|KOTAKBANK',
  'NSE_EQ|LT',
  'NSE_EQ|HCLTECH',
  'NSE_EQ|ASIANPAINT',
  'NSE_EQ|AXISBANK',
  'NSE_EQ|MARUTI',
  'NSE_EQ|SUNPHARMA',
  'NSE_EQ|TITAN',
  'NSE_EQ|BAJAJFINSV',
  'NSE_EQ|ULTRACEMCO',
  'NSE_EQ|NESTLEIND',
  'NSE_EQ|WIPRO',
  'NSE_EQ|ADANIENT',
  'NSE_EQ|ONGC',
  'NSE_EQ|NTPC',
  'NSE_EQ|JSWSTEEL',
  'NSE_EQ|POWERGRID',
  'NSE_EQ|M&M',
  'NSE_EQ|TATAMOTORS',
  'NSE_EQ|TATASTEEL',
  'NSE_EQ|TECHM',
  'NSE_EQ|ADANIPORTS',
  'NSE_EQ|INDUSINDBK',
  'NSE_EQ|COALINDIA',
  'NSE_EQ|HINDALCO',
  'NSE_EQ|CIPLA',
  'NSE_EQ|EICHERMOT',
  'NSE_EQ|GRASIM',
  'NSE_EQ|DRREDDY',
  'NSE_EQ|BRITANNIA',
  'NSE_EQ|APOLLOHOSP',
  'NSE_EQ|DIVISLAB',
  'NSE_EQ|HEROMOTOCO',
  'NSE_EQ|TATACONSUM',
  'NSE_EQ|UPL',
  'NSE_EQ|BAJAJ-AUTO',
  'NSE_EQ|SBILIFE',
  'NSE_EQ|LTIM',
  'NSE_EQ|SHRIRAMFIN',
  'NSE_EQ|TRENT',
];

export const NIFTY50_INDEX = 'NSE_INDEX|Nifty 50';
export const INDIA_VIX = 'NSE_INDEX|India VIX';

// NIFTY50 futures - current month
export const NIFTY50_FUTURES_CURRENT = 'NSE_FO|NIFTY'; // Will need expiry appended
