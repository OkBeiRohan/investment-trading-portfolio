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
    effectiveFrom: '30-09-2024', // Merger/Rebranding
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
    companyName: 'Indian Oil Corporation Ltd',
    symbol: 'IOC',
    instrumentKey: 'NSE_EQ|INE242A01010',
    effectiveFrom: '31-03-2022',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE437A01024',
      symbol: 'APOLLOHOSP'
    }
  },
  {
    companyName: 'GAIL (India) Limited',
    symbol: 'GAIL',
    instrumentKey: 'NSE_EQ|INE129A01019',
    effectiveFrom: '31-03-2021',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE192A01025',
      symbol: 'TATACONSUM'
    }
  },
  {
    companyName: 'Zee Entertainment Enterprises Ltd',
    symbol: 'ZEEL',
    instrumentKey: 'NSE_EQ|INE256A01028',
    effectiveFrom: '25-09-2020',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE123W01016',
      symbol: 'SBILIFE'
    }
  },
  {
    companyName: 'Indus Towers Limited',
    symbol: 'INDUSTOWER', // Formerly Bharti Infratel
    instrumentKey: 'NSE_EQ|INE121J01017',
    effectiveFrom: '25-09-2020',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE361B01024',
      symbol: 'DIVISLAB'
    }
  },
  {
    companyName: 'Vedanta Limited',
    symbol: 'VEDL',
    instrumentKey: 'NSE_EQ|INE205A01025',
    effectiveFrom: '31-07-2020',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE795G01014',
      symbol: 'HDFCLIFE'
    }
  },
  {
    companyName: 'Yes Bank Limited',
    symbol: 'YESBANK',
    instrumentKey: 'NSE_EQ|INE528G01035',
    effectiveFrom: '19-03-2020',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE070A01015',
      symbol: 'SHREECEM'
    }
  },
  {
    companyName: 'Indiabulls Housing Finance Ltd',
    symbol: 'IBULHSGFIN',
    instrumentKey: 'NSE_EQ|INE148I01020',
    effectiveFrom: '27-09-2019',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE239A01016',
      symbol: 'NESTLEIND'
    }
  },
  {
    companyName: 'Hindustan Petroleum Corporation Ltd',
    symbol: 'HPCL',
    instrumentKey: 'NSE_EQ|INE094A01015',
    effectiveFrom: '29-03-2019',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE216A01030',
      symbol: 'BRITANNIA'
    }
  },
  {
    companyName: 'Lupin Limited',
    symbol: 'LUPIN',
    instrumentKey: 'NSE_EQ|INE326A01037',
    effectiveFrom: '28-09-2018',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE019A01038',
      symbol: 'JSWSTEEL'
    }
  },
  {
    companyName: 'Aurobindo Pharma Ltd',
    symbol: 'AUROPHARMA',
    instrumentKey: 'NSE_EQ|INE406A01037',
    effectiveFrom: '28-09-2018',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE047A01021',
      symbol: 'GRASIM'
    }
  },
  {
    companyName: 'Ambuja Cements Ltd',
    symbol: 'AMBUJACEM',
    instrumentKey: 'NSE_EQ|INE079A01024',
    effectiveFrom: '02-04-2018',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE918I01018',
      symbol: 'BAJAJFINSV'
    }
  },
  {
    companyName: 'Bosch Limited',
    symbol: 'BOSCHLTD',
    instrumentKey: 'NSE_EQ|INE323A01026',
    effectiveFrom: '02-04-2018',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE280A01028',
      symbol: 'TITAN'
    }
  },
  {
    companyName: 'ACC Limited',
    symbol: 'ACC',
    instrumentKey: 'NSE_EQ|INE012A01025',
    effectiveFrom: '29-09-2017',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE296A01024',
      symbol: 'BAJFINANCE'
    }
  },
  {
    companyName: 'Bank of Baroda',
    symbol: 'BANKBARODA',
    instrumentKey: 'NSE_EQ|INE028A01039',
    effectiveFrom: '29-09-2017',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE094A01015',
      symbol: 'HPCL'
    }
  },
  {
    companyName: 'Tata Power Co. Ltd',
    symbol: 'TATAPOWER',
    instrumentKey: 'NSE_EQ|INE245A01021',
    effectiveFrom: '29-09-2017',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE628A01036',
      symbol: 'UPL'
    }
  },
  {
    companyName: 'Bharat Heavy Electricals Ltd',
    symbol: 'BHEL',
    instrumentKey: 'NSE_EQ|INE257A01026',
    effectiveFrom: '31-03-2017',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE242A01010',
      symbol: 'IOC'
    }
  },
  {
    companyName: 'Idea Cellular Limited',
    symbol: 'IDEA',
    instrumentKey: 'NSE_EQ|INE669E01016',
    effectiveFrom: '31-03-2017',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE148I01020',
      symbol: 'IBULHSGFIN'
    }
  },
  {
    companyName: 'Punjab National Bank',
    symbol: 'PNB',
    instrumentKey: 'NSE_EQ|INE160A01022',
    effectiveFrom: '01-04-2016',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE406A01037',
      symbol: 'AUROPHARMA'
    }
  },
  {
    companyName: 'Cairn India Limited',
    symbol: 'CAIRN',
    instrumentKey: 'NSE_EQ|INE911H01019',
    effectiveFrom: '01-04-2016',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE121J01017',
      symbol: 'INDUSTOWER'
    }
  },
  {
    companyName: 'Vedanta Limited',
    symbol: 'VEDL',
    instrumentKey: 'NSE_EQ|INE205A01025',
    effectiveFrom: '01-04-2016',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE066A01021',
      symbol: 'EICHERMOT'
    }
  },
  {
    companyName: 'NMDC Limited',
    symbol: 'NMDC',
    instrumentKey: 'NSE_EQ|INE584A01023',
    effectiveFrom: '28-09-2015',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE742F01042',
      symbol: 'ADANIPORTS'
    }
  },
  {
    companyName: 'Jindal Steel & Power Ltd',
    symbol: 'JINDALSTEL',
    instrumentKey: 'NSE_EQ|INE749A01030',
    effectiveFrom: '27-03-2015',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE528G01035',
      symbol: 'YESBANK'
    }
  },
  {
    companyName: 'DLF Limited',
    symbol: 'DLF',
    instrumentKey: 'NSE_EQ|INE271C01023',
    effectiveFrom: '27-03-2015',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE669E01016',
      symbol: 'IDEA'
    }
  },
  {
    companyName: 'United Spirits Limited',
    symbol: 'UNITDSPR',
    instrumentKey: 'NSE_EQ|INE854D01024',
    effectiveFrom: '19-09-2014',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE256A01028',
      symbol: 'ZEEL'
    }
  },
  {
    companyName: 'Siemens Ltd',
    symbol: 'SIEMENS',
    instrumentKey: 'NSE_EQ|INE003A01024',
    effectiveFrom: '01-04-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE095A01012',
      symbol: 'INDUSINDBK'
    }
  },
  {
    companyName: 'Steel Authority of India Ltd',
    symbol: 'SAIL',
    instrumentKey: 'NSE_EQ|INE114A01011',
    effectiveFrom: '01-04-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE584A01023',
      symbol: 'NMDC'
    }
  },
  {
    companyName: 'Wipro Limited',
    symbol: 'WIPRO',
    instrumentKey: 'NSE_EQ|INE076A01029',
    effectiveFrom: '01-04-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE584A01023',
      symbol: 'NMDC'
    }
  },
  {
    companyName: 'Dabur India Ltd',
    symbol: 'DABUR',
    instrumentKey: 'NSE_EQ|INE016A01026',
    effectiveFrom: '24-09-2007',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE733E01010',
      symbol: 'NTPC'
    }
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
  {
    companyName: 'Jet Airways (India) Ltd',
    symbol: 'JETAIRWAYS',
    instrumentKey: 'NSE_EQ|INE802A01018', // Delisted
    effectiveFrom: '29-03-2019',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE148I01020',
      symbol: 'IBULHSGFIN'
    }
  },
  {
    companyName: 'Reliance Infrastructure Ltd',
    symbol: 'RELINFRA',
    instrumentKey: 'NSE_EQ|INE036A01016',
    effectiveFrom: '27-09-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE076A01029',
      symbol: 'WIPRO'
    }
  },
  {
    companyName: 'Jaiprakash Associates Ltd',
    symbol: 'JPASSOCIAT',
    instrumentKey: 'NSE_EQ|INE455F01025',
    effectiveFrom: '01-10-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE669C01036',
      symbol: 'TECHM'
    }
  },
  {
    companyName: 'Idea Cellular Limited',
    symbol: 'IDEA',
    instrumentKey: 'NSE_EQ|INE669E01016',
    effectiveFrom: '01-10-2013',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE089A01023',
      symbol: 'DRREDDY'
    }
  },
  {
    companyName: 'Sterlite Industries (India) Ltd',
    symbol: 'STERLITE',
    instrumentKey: 'NSE_EQ|INE268A01031', // Merged
    effectiveFrom: '28-09-2012',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE481G01011',
      symbol: 'ULTRACEMCO'
    }
  },
  {
    companyName: 'Satyam Computer Services Ltd',
    symbol: 'SATYAMCOMP',
    instrumentKey: 'NSE_EQ|INE275A01028', // Merged into TechM
    effectiveFrom: '12-01-2009',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE013A01015',
      symbol: 'RELCAPITAL'
    }
  },
  {
    companyName: 'Colgate Palmolive (India) Ltd',
    symbol: 'COLPAL',
    instrumentKey: 'NSE_EQ|INE259A01022',
    effectiveFrom: '26-09-2005',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE802A01018',
      symbol: 'JETAIRWAYS'
    }
  },
  {
    companyName: 'The Indian Hotels Company Ltd',
    symbol: 'INDHOTEL',
    instrumentKey: 'NSE_EQ|INE053A01029',
    effectiveFrom: '25-02-2005',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE467B01029',
      symbol: 'TCS'
    }
  },
  {
    companyName: 'Asian Paints Ltd',
    symbol: 'ASIANPAINT',
    instrumentKey: 'NSE_EQ|INE021A01026',
    effectiveFrom: '28-10-2002',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE860A01027',
      symbol: 'HCLTECH'
    }
  },
  {
    companyName: 'Procter & Gamble Hygiene',
    symbol: 'PGHH',
    instrumentKey: 'NSE_EQ|INE179A01014',
    effectiveFrom: '28-10-2002',
    addedInstrument: {
      instrumentKey: 'NSE_EQ|INE029A01011',
      symbol: 'BPCL'
    }
  }
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
