export type MarketInstrumentSegment =
  | "INDEX"
  | "EQUITY"
  | "DERIVATIVE"
  | "COMMODITY";

export type MarketInstrumentType<Segment extends MarketInstrumentSegment> =
  Segment extends "INDEX"
    ? "MARKET_INDEX" | "SECTOR_INDEX" | "THEMATIC_INDEX"
    : Segment extends "EQUITY"
      ? "STOCK" | "ETF" | "MUTUAL_FUND"
      : Segment extends "DERIVATIVE"
        ? "FUTURE" | "OPTION"
        : Segment extends "COMMODITY"
          ? "METAL" | "ENERGY" | "AGRICULTURE"
          : never;

export type MarketExchange = "NSE" | "BSE" | "MCX" | "FOREX" | "CRYPTO";

export default interface IMarketInstrument<
  Segment extends MarketInstrumentSegment = MarketInstrumentSegment,
> {
  instrumentKey: string;
  exchange: MarketExchange;
  segment: Segment;
  type: MarketInstrumentType<Segment>;
  symbol: string;
  companyName: string;
  isin?: string;
  lotSize?: number;
  expiryDate?: Date;
}
