import { MarketExchange } from "./exchange";
import { MarketInstrumentSegment, MarketInstrumentType } from "./segment";

export default interface IMarketInstrument<
  Exchange extends MarketExchange = "NSE",
  Segment extends MarketInstrumentSegment = "EQ",
  Type extends MarketInstrumentType<Segment> = MarketInstrumentType<Segment>,
> {
  instrumentKey: string;
  exchange: Exchange;
  segment: Segment extends "CRYPTO" ? "CUR" : Segment;
  type: Segment extends "CRYPTO" ? "CRYPTO" : Type;
  symbol: string;
  name: string;
  expiry: Segment extends "DERIVATIVE" | "COMMODITY" ? Date : never;
  strike: Segment extends "DERIVATIVE"
    ? Type extends "OPTION"
      ? number
      : never
    : never;
  optionType: Segment extends "DERIVATIVE"
    ? Type extends "OPTION"
      ? "CE" | "PE"
      : never
    : never;
  isin: string;
}
