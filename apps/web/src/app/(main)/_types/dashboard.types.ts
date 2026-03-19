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

export interface PortfolioPill {
  label: string;
  value: number;
  variant: "stock" | "fo" | "crypto";
}

export interface CandlestickDataPoint {
  month: number;
  open: number;
  high: number;
  low: number;
  close: number;
  date: string;
  volume: number;
}

export interface TransferItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: "sent" | "received" | "swap";
}

export interface SpendingCategory {
  label: string;
  color: string;
  flex: number;
}

export interface AIKnowledgeEntry {
  keywords: string[];
  response: string;
}
