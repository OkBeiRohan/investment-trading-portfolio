import nifty50Data from './nifty50-constituents.json';

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

interface Nifty50Constituent {
  companyName: string;
  industry: string;
  symbol: string;
  series: string;
  isin: string;
  instrumentKey: string;
}

interface Nifty50Data {
  metadata: {
    index: string;
    lastUpdated: string;
    totalConstituents: number;
  };
  constituents: Nifty50Constituent[];
}

const data: Nifty50Data = nifty50Data as Nifty50Data;

// Export array of instrument keys (for backward compatibility)
export const NIFTY50_CONSTITUENTS = data.constituents.map(
  (c) => c.instrumentKey,
);

// Export full constituent data for enriched usage
export const NIFTY50_CONSTITUENTS_DATA = data.constituents;

export const REMOVED_NIFTY50_CONSTITUENTS = [
  {
    companyName: 'UPL Limited',
    symbol: 'UPL',
    instrumentKey: 'NSE_EQ|INE628A01036',
    effectiveFrom: '28-03-2024',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE721A01047',
      symbol: 'SHRIRAMFIN',
    },
  },
  {
    companyName: 'LTI Mindtree Limited',
    symbol: 'LTI',
    instrumentKey: 'NSE_EQ|INE214T01019',
    effectiveFrom: '30-09-2024',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE263A01024',
      symbol: 'BEL',
    },
  },
  {
    companyName: 'Divis Laboratories Limited',
    symbol: 'DIVISLAB',
    instrumentKey: 'NSE_EQ|INE361B01024',
    effectiveFrom: '30-09-2024',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE849A01020',
      symbol: 'TRENT',
    },
  },
  {
    companyName: 'Britannia Industries Limited',
    symbol: 'BRITANNIA',
    instrumentKey: 'NSE_EQ|INE216A01030',
    effectiveFrom: '28-03-2025',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE758T01015',
      symbol: 'ETERNAL',
    },
  },
  {
    companyName: 'Bharat Petroleum Corp',
    symbol: 'BPCL',
    instrumentKey: 'NSE_EQ|INE029A01011',
    effectiveFrom: '28-03-2025',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE758E01017',
      symbol: 'JIOFIN',
    },
  },
  {
    companyName: 'Hero MotoCorp Limited',
    symbol: 'HEROMOTOCO',
    instrumentKey: 'NSE_EQ|INE158A01026',
    effectiveFrom: '30-09-2025',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE646L01027',
      symbol: 'INDIGO',
    },
  },
  {
    companyName: 'IndusInd Bank Limited',
    symbol: 'INDUSINDBK',
    instrumentKey: 'NSE_EQ|INE095A01012',
    effectiveFrom: '30-09-2025',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE027H01010',
      symbol: 'MAXHEALTH',
    },
  },
];

// Export metadata
export const NIFTY50_METADATA = data.metadata;

export const NIFTY50_INDEX = 'NSE_INDEX|Nifty 50';
export const INDIA_VIX = 'NSE_INDEX|India VIX';

// NIFTY50 futures - current month
export const NIFTY50_FUTURES_CURRENT = 'NSE_FO|49229'; // Will need expiry appended

export const NIFTY50_FUTURES = [
  'NSE_FO|49229', // 26 Jan 2026
  'NSE_FO|59182', // 24 Feb 2026
  'NSE_FO|51714', // 30 Mar 2026
];

// NO DATA RECEIVED FOR NSE_FO|35005|26-12-2024 (Expired contract for Dec 2024)
