export interface HistoricalCandleRequest {
  instrument_key: string;
  interval: string; // '1', '3', '5', '15', '30' (minutes) or '1' (hour/day/week/month)
  unit: "minutes" | "hours" | "days" | "weeks" | "months";
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
}

export interface IntradayCandleRequest {
  instrument_key: string;
  interval: string;
  unit: "minutes" | "hours" | "days";
}

export interface CandleResponse {
  status: string;
  data: {
    candles: Array<
      [
        string, // timestamp
        number, // open
        number, // high
        number, // low
        number, // close
        number, // volume
        number, // open_interest
      ]
    >;
  };
}

export interface ExpiredContractsRequest {
  symbol: string; // 'NIFTY', 'BANKNIFTY', etc.
  expiry_date: string; // YYYY-MM-DD
}

export interface ExpiredContractsResponse {
  status: string;
  data: Array<{
    instrument_key: string;
    name: string;
    exchange: string;
    trading_symbol: string;
  }>;
}
