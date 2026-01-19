export type MarketExchange = "NSE" | "BSE" | "MCX" | "FOREX" | "CRYPTO";

export const MarketExchangeDetails: {
  [key in MarketExchange]: {
    name: string;
    description: string;
  };
} = {
  FOREX: {
    name: "Forex",
    description: "Foreign exchange market",
  },
  CRYPTO: {
    name: "Cryptocurrency",
    description: "Cryptocurrency market",
  },
  NSE: {
    name: "NSE",
    description: "National Stock Exchange of India",
  },
  BSE: {
    name: "BSE",
    description: "Bombay Stock Exchange",
  },
  MCX: {
    name: "MCX",
    description: "Multi Commodity Exchange of India",
  },
};
