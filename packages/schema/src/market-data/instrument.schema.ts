import {
  MarketCommodityExchange,
  MarketCryptoExchange,
  MarketCurrencyExchange,
  MarketDerivativeExchange,
  MarketEquityExchange,
} from "./exchange";
import {
  MarketCommoditySegment,
  MarketCurrencySegment,
  MarketDerivativeSegment,
  MarketEquitySegment,
  MarketIndexSegment,
} from "./segment";
import {
  MarketInstrumentCommodityType,
  MarketInstrumentCryptoType,
  MarketInstrumentCurrencyType,
  MarketInstrumentDerivativeType,
  MarketInstrumentEquityType,
  MarketInstrumentIndexType,
} from "./type";

/** Market Instrument Base Details */
export interface IMarketInstrumentBase {
  /** Unique identifier for the instrument. Eg. NSE_INDEX|Nifty 50 */
  instrumentKey: string;

  /** Instrument symbol/code. Eg. AAPL, BTC, EURUSD, RELIANCE, NIFTY 50 */
  symbol: string;

  /** Instrument display name. Eg. Apple Inc., Bitcoin, Euro/USD, Reliance Industries, Nifty 50 */
  name: string;

  /** Last updated timestamp in ISO 8601 format. Eg. 2024-06-01T12:00:00Z */
  lastUpdated: string;

  /** Is the instrument currently active/tradable */
  isActive: boolean;
}

/** Market Index Instrument */
export interface IMarketIndexInstrument {
  exchange: MarketEquityExchange;
  segment: MarketIndexSegment;
  type: MarketInstrumentIndexType;
}

export interface IMarketEquityInstrument {
  exchange: MarketEquityExchange;
  segment: MarketEquitySegment;
  type: MarketInstrumentEquityType;
}

export interface IMarketDerivativeInstrument {
  exchange: MarketDerivativeExchange;
  segment: MarketDerivativeSegment;
  type: MarketInstrumentDerivativeType;
}

export interface IMarketCommodityInstrument {
  exchange: MarketCommodityExchange;
  segment: MarketCommoditySegment;
  type: MarketInstrumentCommodityType;
}

export interface IMarketCurrencyInstrument {
  exchange: MarketCurrencyExchange;
  segment: MarketCurrencySegment;
  type: MarketInstrumentCurrencyType;
}

export interface IMarketCryptoInstrument {
  exchange: MarketCryptoExchange;
  segment: MarketCurrencySegment;
  type: MarketInstrumentCryptoType;
}

type IMarketInstrument = IMarketInstrumentBase &
  (
    | IMarketIndexInstrument
    | IMarketEquityInstrument
    | IMarketDerivativeInstrument
    | IMarketCommodityInstrument
    | IMarketCurrencyInstrument
    | IMarketCryptoInstrument
  );
export default IMarketInstrument;
