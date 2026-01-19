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

export interface IMarketInstrumentBase {
  instrumentKey: string;
  tradingSymbol: string;
  name: string;

  lastUpdated: string;
}

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
