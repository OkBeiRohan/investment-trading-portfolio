export interface MarketTickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TradingMetric {
  label: string;
  value: string;
  description?: string;
}

export interface QuickAction {
  label: string;
  icon: string;
  color: string;
  href: string;
}

export type MarketMoodType = "bullish" | "neutral" | "bearish";

export interface MarketMood {
  mood: MarketMoodType;
  score: number;
  label: string;
}
