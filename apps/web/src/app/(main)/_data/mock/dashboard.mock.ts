import type {
  MarketTickerItem,
  AIMessage,
  TradingMetric,
  MarketMood,
  PortfolioPill,
  TransferItem,
  SpendingCategory,
  AIKnowledgeEntry,
} from "../../_types";

export const mockMarketTicker: MarketTickerItem[] = [
  { symbol: "Nifty 50", name: "Nifty 50", price: 25500, change: 2040, changePercent: 8.0 },
  { symbol: "SENSEX", name: "SENSEX", price: 87500, change: 7000, changePercent: 8.0 },
  { symbol: "Bank Nifty", name: "Bank Nifty", price: 19270.56, change: -1541.64, changePercent: -8.0 },
  { symbol: "BTC", name: "Bitcoin", price: 117013.6, change: 8960.4, changePercent: 8.3 },
  { symbol: "ETH", name: "Ethereum", price: 2987.66, change: 239.01, changePercent: 8.7 },
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
    content: "**Trade Focus:**\n• Buy & watch: SOL, LINK (short-term swing)\n• Avoid: DOGE, MATIC (high risk today)",
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

export const mockPortfolioPills: PortfolioPill[] = [
  { label: "Stock Portfolio", value: -4156.32, variant: "stock" },
  { label: "F&O Portfolio", value: -3156.32, variant: "fo" },
];

export const mockTransfers: TransferItem[] = [
  { id: "t1", title: "Sent USDT", subtitle: "To: 0x8f3E...1OpH", amount: -159.0, type: "sent" },
  { id: "t2", title: "Received ETH", subtitle: "From: 0x4aB2...9cEf", amount: 2340.0, type: "received" },
  { id: "t3", title: "Swap BTC → USDT", subtitle: "Via Quantum Exchange", amount: -890.5, type: "swap" },
];

export const mockSpendingCategories: SpendingCategory[] = [
  { label: "Stocks", color: "var(--color-primary)", flex: 4 },
  { label: "F&O", color: "var(--color-indigo)", flex: 2 },
  { label: "Crypto", color: "var(--color-amber)", flex: 2 },
  { label: "Bonds", color: "var(--color-violet)", flex: 1.5 },
  { label: "ETFs", color: "var(--color-cyan)", flex: 1 },
  { label: "Cash", color: "var(--color-text-muted)", flex: 1 },
];

export const mockChartMetrics: TradingMetric[] = [
  { label: "Gain to pain ratio", value: "1.8" },
  { label: "Reward to risk ratio", value: "2.4" },
  { label: "Leverage used", value: "$120,000" },
];

export const mockAIKnowledge: AIKnowledgeEntry[] = [
  {
    keywords: ["portfolio", "overview", "summary", "how", "doing", "status", "performance"],
    response:
      "✦ **Portfolio Overview:**\n• Total portfolio value: **$44,553.00**\n• Stock portfolio: **-$4,156.32** (in loss)\n• F&O portfolio: **-$3,156.32** (in loss)\n• Gain-to-pain ratio: 1.8 (moderate)\n• Reward-to-risk ratio: 2.4 (favorable)\n\nConsider rebalancing your stock positions to reduce losses.",
  },
  {
    keywords: ["market", "nifty", "sensex", "index", "indices", "bank nifty", "today"],
    response:
      "✦ **Market Snapshot:**\n• Nifty 50: **25,500** +8% — bullish momentum\n• SENSEX: **87,500** +8% — strong rally\n• Bank Nifty: **19,270.56** -8% — under pressure\n\nBanking sector weakness suggests caution with bank stocks. Broader market remains strong.",
  },
  {
    keywords: ["risk", "leverage", "exposure", "danger", "risky"],
    response:
      "✦ **Risk Assessment:**\n• Current leverage: **$120,000** — high relative to portfolio size\n• Leverage ratio: ~2.7x your portfolio value\n• Both stock and F&O portfolios are in loss — consider reducing positions\n• Bank Nifty declining at -8% adds sector risk\n\n**Recommendation:** Reduce leverage below 2x and hedge F&O positions with protective puts.",
  },
  {
    keywords: ["buy", "sell", "trade", "focus", "recommend", "should", "what", "pick", "suggest"],
    response:
      "✦ **Trade Focus:**\n• **Buy & watch:** SOL, LINK (short-term swing — momentum building)\n• **Hold:** RELIANCE, TCS (strong fundamentals, market tailwind)\n• **Avoid:** DOGE, MATIC (high risk today — weak volume)\n• **Consider exiting:** Bank sector positions (Bank Nifty -8%)\n\nFocus on crypto swing trades while the broader equity market is green.",
  },
  {
    keywords: ["crypto", "bitcoin", "btc", "eth", "sol", "link", "coin"],
    response:
      "✦ **Crypto Analysis:**\n• **BTC/USDT:** Consolidating — watch for breakout above $68k\n• **ETH:** Strong momentum, recent inflow of +$2,340 to your wallet\n• **SOL:** Buy zone — short-term swing potential with rising volume\n• **LINK:** Accumulation phase — good entry for DCA strategy\n\nYour recent BTC→USDT swap freed up capital. Consider redeploying into SOL or LINK.",
  },
  {
    keywords: ["transfer", "transaction", "sent", "received", "swap", "history"],
    response:
      "✦ **Recent Transfers:**\n• Sent USDT: **-$159.00** to 0x8f3E...1OpH\n• Received ETH: **+$2,340.00**\n• Swap BTC → USDT: **-$890.50**\n\nNet flow this week: **+$1,290.50** — positive inflow.",
  },
  {
    keywords: ["spending", "allocation", "breakdown", "distribute", "diversif"],
    response:
      "✦ **Allocation Breakdown:**\n• Stocks: ~35% of portfolio (largest allocation)\n• F&O: ~18% — high risk segment\n• Crypto: ~20% — growing allocation\n• Bonds & ETFs: ~15% — defensive positions\n• Cash: ~12% — available for deployment\n\nSpending is down $30 this week. Consider increasing your defensive allocation given the F&O losses.",
  },
  {
    keywords: ["hello", "hi", "hey", "help", "start"],
    response:
      "✦ Hello! I'm your **Quantum Trades AI Assistant**. I can help you with:\n• Portfolio overview & performance analysis\n• Market insights (Nifty, SENSEX, Bank Nifty)\n• Trade recommendations & focus areas\n• Risk assessment & leverage analysis\n• Crypto analysis & strategies\n• Transaction history & spending breakdown\n\nWhat would you like to know?",
  },
];
