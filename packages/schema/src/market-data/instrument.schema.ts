import MarketExchange, {
  MarketCommodityExchange,
  MarketCryptoExchange,
  MarketCurrencyExchange,
  MarketDerivativeExchange,
  MarketEquityExchange,
} from "./exchange";
import MarketSegment from "./segment";
import MarketInstrumentSegment, {
  MarketCommoditySegment,
  MarketCurrencySegment,
  MarketDerivativeSegment,
  MarketEquitySegment,
  MarketIndexSegment,
} from "./segment";
import MarketInstrumentType, {
  MarketInstrumentCommodityType,
  MarketInstrumentCryptoType,
  MarketInstrumentCurrencyType,
  MarketInstrumentDerivativeType,
  MarketInstrumentEquityType,
  MarketInstrumentFutureType,
  MarketInstrumentIndexType,
  MarketInstrumentOptionType,
} from "./type";

/** Market Instrument Base Details */
export interface IMarketInstrumentBase {
  /** Unique identifier for the instrument. Eg. NSE_INDEX|Nifty 50 */
  instrumentKey: string;

  /** Instrument symbol/code. Eg. AAPL, BTC, EURUSD, RELIANCE, NIFTY 50 */
  symbol: string;

  /** Instrument display name. Eg. Apple Inc., Bitcoin, Euro/USD, Reliance Industries, Nifty 50 */
  name: string;

  /** Tick size for the instrument. Eg. 0.01, 1 */
  tickSize: number;

  /** Last updated timestamp in ISO 8601 format. Eg. 2024-06-01T12:00:00Z */
  lastUpdated: string;

  /** Is the instrument currently active/tradable */
  isActive: boolean;

  /** Market exchange where the instrument is listed/traded */
  exchange: MarketExchange;

  /** Market segment/category of the instrument */
  segment: MarketSegment;

  /** Type/category of the instrument */
  type: MarketInstrumentType;
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

export interface IMarketDerivativeBaseInstrument {
  exchange: MarketDerivativeExchange;
  segment: MarketDerivativeSegment;
  type: MarketInstrumentDerivativeType;
  underlyingKey: string;
  expiry: string;
  isExpired: boolean;
}

export interface IMarketFutureInstrument {
  type: MarketInstrumentFutureType;
}

export interface IMarketOptionInstrument {
  type: MarketInstrumentOptionType;
  strike: number;
  optionType: "CALL" | "PUT";
  lotSize: number;
  minimumLots: number;

  /** Maximum permissible order quantity for a single trade */
  freezeQuantity: number;
  weeklyExpiry: boolean;
}

export type IMarketDerivativeInstrument =
  | (IMarketDerivativeBaseInstrument & IMarketFutureInstrument)
  | (IMarketDerivativeBaseInstrument & IMarketOptionInstrument);

export interface IMarketCommodityBaseInstrument {
  exchange: MarketCommodityExchange;
  segment: MarketCommoditySegment;
  type: MarketInstrumentCommodityType;
  expiry: string;
  isExpired: boolean;
}

export type IMarketCommodityInstrument =
  | (IMarketCommodityBaseInstrument & IMarketFutureInstrument)
  | (IMarketCommodityBaseInstrument & IMarketOptionInstrument);

export interface IMarketCurrencyInstrument {
  exchange: MarketCurrencyExchange;
  segment: MarketCurrencySegment;
  type: MarketInstrumentCurrencyType;
  expiry: string;
  isExpired: boolean;
}

export interface IMarketCryptoInstrument {
  exchange: MarketCryptoExchange;
  segment: MarketCurrencySegment;
  type: MarketInstrumentCryptoType;
  expiry?: string;
  isExpired?: boolean;
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
