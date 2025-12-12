import { Logger } from "@nestjs/common";
import * as protobuf from "protobufjs";
import * as path from "path";
import { WebSocketError } from "../../../core/error";

export interface DecodedFeed {
  type: string;
  feeds: Map<string, FeedData>;
  timestamp: number;
}

export interface FeedData {
  instrumentKey: string;
  ltp?: number;
  ltq?: number;
  ltt?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  bidPrice?: number;
  bidQty?: number;
  askPrice?: number;
  askQty?: number;
  greeks?: {
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    iv?: number;
  };
}

export class ProtoDecoder {
  private readonly logger = new Logger(ProtoDecoder.name);
  private root: protobuf.Root | null = null;
  private FeedResponse: protobuf.Type | null = null;

  async initialize(): Promise<void> {
    try {
      const protoPath = path.join(__dirname, "proto", "MarketDataFeedV3.proto");
      this.root = await protobuf.load(protoPath);
      this.FeedResponse = this.root.lookupType(
        "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse"
      );
      this.logger.log("Protobuf decoder initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize protobuf decoder:", error);
      throw new WebSocketError("Failed to initialize proto decoder", error);
    }
  }

  decode(buffer: Buffer): DecodedFeed {
    if (!this.FeedResponse) {
      throw new WebSocketError("Proto decoder not initialized");
    }

    try {
      const message = this.FeedResponse.decode(buffer);
      const object = this.FeedResponse.toObject(message, {
        longs: Number,
        enums: String,
        bytes: String,
      }) as any;

      const feeds = new Map<string, FeedData>();

      // Parse feeds
      if (object.feeds) {
        for (const [instrumentKey, feed] of Object.entries(object.feeds)) {
          feeds.set(instrumentKey, this.parseFeed(feed as any, instrumentKey));
        }
      }

      return {
        type: object.type || "live_feed",
        feeds,
        timestamp: object.currentTs || Date.now(),
      };
    } catch (error) {
      this.logger.error("Failed to decode protobuf message:", error);
      throw new WebSocketError("Failed to decode message", error);
    }
  }

  private parseFeed(feed: any, instrumentKey: string): FeedData {
    const result: FeedData = {
      instrumentKey,
    };

    // LTPC data
    if (feed.ltpc) {
      result.ltp = feed.ltpc.ltp;
      result.ltq = feed.ltpc.ltq;
      result.ltt = feed.ltpc.ltt;
    }

    // Full feed data
    if (feed.fullFeed?.marketFF) {
      const marketFF = feed.fullFeed.marketFF;

      if (marketFF.ltpc) {
        result.ltp = marketFF.ltpc.ltp;
        result.ltq = marketFF.ltpc.ltq;
        result.ltt = marketFF.ltpc.ltt;
      }

      // Market depth (first level)
      if (marketFF.marketLevel?.bidAskQuote?.[0]) {
        const quote = marketFF.marketLevel.bidAskQuote[0];
        result.bidPrice = quote.bidP;
        result.bidQty = quote.bidQ;
        result.askPrice = quote.askP;
        result.askQty = quote.askQ;
      }

      // Option Greeks
      if (marketFF.optionGreeks) {
        result.greeks = {
          delta: marketFF.optionGreeks.delta,
          gamma: marketFF.optionGreeks.gamma,
          theta: marketFF.optionGreeks.theta,
          vega: marketFF.optionGreeks.vega,
          iv: marketFF.iv,
        };
      }

      // OHLC data
      if (marketFF.marketOHLC?.ohlc?.[0]) {
        const ohlc = marketFF.marketOHLC.ohlc[0];
        result.open = ohlc.open;
        result.high = ohlc.high;
        result.low = ohlc.low;
        result.close = ohlc.close;
        result.volume = ohlc.vol;
      }
    }

    return result;
  }

  isInitialized(): boolean {
    return this.root !== null && this.FeedResponse !== null;
  }
}
