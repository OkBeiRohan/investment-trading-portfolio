export type MarketInstrumentSegment = "INDEX" | "EQ" | "FO" | "COM" | "CUR";

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

export type MarketInstrumentType<
  Segment extends MarketInstrumentSegment = "EQ",
> = Segment extends "INDEX"
  ? "MARKET" | "SECTOR" | "THEMATIC" | "OTHER"
  : Segment extends "EQ"
    ? "STOCK" | "ETF" | "MUTUAL_FUND"
    : Segment extends "FO"
      ? "FUTURE" | "OPTION"
      : Segment extends "COM"
        ? "METAL" | "ENERGY" | "AGRICULTURE"
        : Segment extends "CUR"
          ? "FOREX" | "CRYPTO"
          : never;

export const MarketInstrumentTypeDetails: {
  [key in MarketInstrumentSegment]: {
    [type in MarketInstrumentType<key>]: {
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
    METAL: {
      name: "Metal",
      description: "Commodity instruments for metals like gold and silver",
    },
    ENERGY: {
      name: "Energy",
      description: "Commodity instruments for energy products like oil and gas",
    },
    AGRICULTURE: {
      name: "Agriculture",
      description:
        "Commodity instruments for agricultural products like wheat and corn",
    },
  },
  CUR: {
    FOREX: {
      name: "Forex",
      description: "Foreign exchange currency trading instruments",
    },
    CRYPTO: {
      name: "Cryptocurrency",
      description: "Digital currency trading instruments",
    },
  },
};
