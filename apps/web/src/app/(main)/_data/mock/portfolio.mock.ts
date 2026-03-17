import type {
  PortfolioSummary,
  AssetAllocation,
  PerformanceDataPoint,
  WatchlistItem,
  RiskMetrics,
  StatMetric,
} from "../../_types";

export const mockPortfolio: PortfolioSummary = {
  totalValue: 128429.0,
  todayChange: 10859.48,
  todayChangePercent: 15.4,
  realizedPnl: 35021.1,
  unrealizedPnl: -11284.32,
  investedValue: 93407.9,
};

export const mockAllocation: AssetAllocation[] = [
  { label: "Equities", value: 56685, percentage: 44, color: "var(--color-primary)" },
  { label: "Crypto", value: 19839, percentage: 15, color: "#22c55e" },
  { label: "Fixed Income", value: 25686, percentage: 20, color: "var(--color-amber)" },
  { label: "Commodities", value: 17950, percentage: 14, color: "var(--color-violet)" },
  { label: "Cash", value: 8269, percentage: 7, color: "var(--color-text-tertiary)" },
];

export const mockPerformance: PerformanceDataPoint[] = [
  { date: "Jan", value: 95200 },
  { date: "Feb", value: 98400 },
  { date: "Mar", value: 94100 },
  { date: "Apr", value: 102800 },
  { date: "May", value: 108500 },
  { date: "Jun", value: 105200 },
  { date: "Jul", value: 112300 },
  { date: "Aug", value: 109800 },
  { date: "Sep", value: 116400 },
  { date: "Oct", value: 120100 },
  { date: "Nov", value: 124600 },
  { date: "Dec", value: 128429 },
];

export const mockWatchlist: WatchlistItem[] = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.72,
    change: 2.34,
    changePercent: 1.33,
    sparkline: [170, 172, 169, 174, 176, 173, 175, 178],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 67234.5,
    change: -1245.3,
    changePercent: -1.82,
    sparkline: [69200, 68400, 68900, 67800, 67200, 68100, 67500, 67234],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.42,
    change: 8.56,
    changePercent: 3.57,
    sparkline: [235, 238, 240, 236, 242, 245, 243, 248],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3521.8,
    change: 45.2,
    changePercent: 1.3,
    sparkline: [3400, 3450, 3420, 3480, 3500, 3460, 3510, 3521],
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    price: 415.26,
    change: -3.14,
    changePercent: -0.75,
    sparkline: [420, 418, 419, 416, 417, 414, 415, 415],
  },
];

export const mockRisk: RiskMetrics = {
  overallScore: 57,
  highRiskPercent: 34,
  mediumRiskPercent: 57,
  lowRiskPercent: 9,
};

export const mockStats: StatMetric[] = [
  {
    label: "Total Value",
    value: "$128,429.00",
    change: 15.4,
    changeLabel: "Today",
    color: "emerald",
  },
  {
    label: "Realized P&L",
    value: "+$35,021.10",
    change: 27,
    changeLabel: "Today",
    color: "emerald",
  },
  {
    label: "Unrealized P&L",
    value: "-$11,284.32",
    change: -11.8,
    changeLabel: "Today",
    color: "coral",
  },
  {
    label: "Win Rate",
    value: "64.2%",
    change: 2.1,
    changeLabel: "vs last month",
    color: "amber",
  },
];
