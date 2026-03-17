export interface PortfolioSummary {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  investedValue: number;
}

export interface AssetAllocation {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

export interface RiskMetrics {
  overallScore: number;
  highRiskPercent: number;
  mediumRiskPercent: number;
  lowRiskPercent: number;
}

export interface StatMetric {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color: "emerald" | "coral" | "amber" | "sky" | "violet";
}
