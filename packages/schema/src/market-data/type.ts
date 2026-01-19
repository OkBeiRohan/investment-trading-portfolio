import MarketInstrumentSegment from "./segment";

export type MarketInstrumentIndexType =
  | "MARKET"
  | "SECTOR"
  | "THEMATIC"
  | "OTHER";
export type MarketInstrumentEquityType = "STOCK" | "ETF" | "MUTUAL_FUND";
export type MarketInstrumentDerivativeType = "FUTURE" | "OPTION";
export type MarketInstrumentCommodityType = "FUTURE" | "OPTION";
export type MarketInstrumentCurrencyType = "CURRENCY" | "FUTURE";
export type MarketInstrumentCryptoType = "COIN" | "FUTURE" | "TOKEN" | "NFT";

type MarketInstrumentType =
  | MarketInstrumentIndexType
  | MarketInstrumentEquityType
  | MarketInstrumentDerivativeType
  | MarketInstrumentCommodityType
  | MarketInstrumentCurrencyType
  | MarketInstrumentCryptoType;
export default MarketInstrumentType;

export const MarketInstrumentTypeDetails: {
  [key in MarketInstrumentSegment]: {
    [type in MarketInstrumentType]?: {
      name: string;
      description: string;
    };
  };
} = {
  INDEX: {
    MARKET: {
      name: "Market Index",
      description:
        "Broad market indices representing overall market performance",
    },
    SECTOR: {
      name: "Sector Index",
      description: "Indices representing specific market sectors",
    },
    THEMATIC: {
      name: "Thematic Index",
      description: "Indices based on specific investment themes",
    },
    OTHER: {
      name: "Other Index",
      description: "Other types of indices",
    },
  },
  EQ: {
    STOCK: {
      name: "Stock",
      description: "Individual equity shares of companies",
    },
    ETF: {
      name: "ETF",
      description: "Exchange-Traded Funds representing baskets of assets",
    },
    MUTUAL_FUND: {
      name: "Mutual Fund",
      description: "Pooled investment vehicles managed by professionals",
    },
  },
  FO: {
    FUTURE: {
      name: "Future",
      description:
        "Standardized contracts to buy or sell assets at a future date",
    },
    OPTION: {
      name: "Option",
      description:
        "Contracts granting the right to buy or sell assets at a set price",
    },
  },
  COM: {
    FUTURE: {
      name: "Commodity Future",
      description: "Futures contracts for commodities like metals and energy",
    },
    OPTION: {
      name: "Commodity Option",
      description: "Options contracts for commodities",
    },
  },
  CUR: {
    CURRENCY: {
      name: "Currency",
      description: "Foreign exchange currency",
    },
    FUTURE: {
      name: "Currency Future",
      description: "Futures contracts for currency trading",
    },
    COIN: {
      name: "Coin",
      description: "Digital currency instruments like Bitcoin and Ethereum",
    },
    TOKEN: {
      name: "Token",
      description: "Digital tokens representing assets or utilities",
    },
    NFT: {
      name: "NFT",
      description: "Non-Fungible Tokens representing unique digital assets",
    },
  },
};
