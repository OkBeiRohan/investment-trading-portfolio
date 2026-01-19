export type MarketIndexSegment = "INDEX";
export type MarketEquitySegment = "EQ";
export type MarketDerivativeSegment = "FO";
export type MarketCommoditySegment = "COM";
export type MarketCurrencySegment = "CUR";

type MarketInstrumentSegment =
  | MarketIndexSegment
  | MarketEquitySegment
  | MarketDerivativeSegment
  | MarketCommoditySegment
  | MarketCurrencySegment;
export default MarketInstrumentSegment;

export const MarketInstrumentSegmentDetails: {
  [key in MarketInstrumentSegment]: {
    name: string;
    description: string;
  };
} = {
  INDEX: {
    name: "Index",
    description: "Index instruments representing market segments",
  },
  EQ: {
    name: "Equity",
    description: "Equity instruments including stocks and ETFs",
  },
  FO: {
    name: "Derivative",
    description: "Futures and options instruments",
  },
  COM: {
    name: "Commodity",
    description:
      "Commodity instruments including metals, energy, and agriculture",
  },
  CUR: {
    name: "Currency",
    description: "Currency trading instruments",
  },
};
