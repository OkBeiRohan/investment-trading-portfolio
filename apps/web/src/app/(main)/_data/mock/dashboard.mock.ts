import type {
  MarketTickerItem,
  AIMessage,
  TradingMetric,
  MarketMood,
} from "../../_types";

export const mockMarketTicker: MarketTickerItem[] = [
  { symbol: "BTC", name: "Bitcoin", price: 117013.6, change: 8960.4, changePercent: 8.3 },
  { symbol: "ETH", name: "Ethereum", price: 2987.66, change: 239.01, changePercent: 8.7 },
  { symbol: "BNB", name: "Binance Coin", price: 19270.56, change: 1541.64, changePercent: 8.7 },
  { symbol: "SOL", name: "Solana", price: 184.32, change: 12.45, changePercent: 7.2 },
  { symbol: "AAPL", name: "Apple", price: 178.72, change: 2.34, changePercent: 1.33 },
  { symbol: "MSFT", name: "Microsoft", price: 415.26, change: -3.14, changePercent: -0.75 },
];

export const mockAIMessages: AIMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Where should I focus trading?",
    timestamp: "2026-03-18T09:30:00Z",
  },
  {
    id: "2",
    role: "assistant",
    content: "Based on your portfolio analysis:\n\n**Trade Focus:**\n- Buy & watch: SOL, LINK (short-term swing)\n- Hold strong: BTC, ETH positions looking healthy\n\n**Avoid:** DOGE, MATIC (high risk today)\n\nYour win rate is trending up at 64.2%. Keep focusing on setups with 2:1 risk/reward or better.",
    timestamp: "2026-03-18T09:30:05Z",
  },
];

export const mockTradingMetrics: TradingMetric[] = [
  { label: "Gain to Pain Ratio", value: "1.8", description: "Good" },
  { label: "Risk to Reward", value: "2.4", description: "Excellent" },
  { label: "Leverage Used", value: "$120,000", description: "Moderate" },
  { label: "Sharpe Ratio", value: "1.42", description: "Above average" },
];

export const mockMarketMood: MarketMood = {
  mood: "bullish",
  score: 72,
  label: "Market is showing strength",
};
