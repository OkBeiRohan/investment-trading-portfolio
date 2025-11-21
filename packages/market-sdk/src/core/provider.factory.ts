import { UpstoxProvider } from "../providers/upstox/upstox.provider";
import { YahooProvider } from "../providers/yahoo/yahoo.provider";
import { BinanceProvider } from "../providers/binance/binance.provider";

export type ProviderType = "upstox" | "yahoo" | "binance";

export class ProviderFactory {
  private static instances = new Map<ProviderType, any>();

  static create(type: ProviderType, config?: any): any {
    // Singleton pattern (optional)
    if (this.instances.has(type)) {
      return this.instances.get(type);
    }

    let provider: any;
    switch (type) {
      case "upstox":
        provider = new UpstoxProvider(/* inject dependencies */);
        break;
      case "yahoo":
        provider = new YahooProvider(/* inject dependencies */);
        break;
      case "binance":
        provider = new BinanceProvider(/* inject dependencies */);
        break;
      default:
        throw new Error(`Unknown provider: ${type}`);
    }

    this.instances.set(type, provider);
    return provider;
  }

  /**
   * Auto-detect provider based on instrument key
   */
  static getProviderForInstrument(instrumentKey: string): ProviderType {
    if (instrumentKey.startsWith("NSE_") || instrumentKey.startsWith("BSE_")) {
      return "upstox";
    }
    if (instrumentKey.includes("BTC") || instrumentKey.includes("ETH")) {
      return "binance";
    }
    return "yahoo"; // Default for stocks
  }
}
