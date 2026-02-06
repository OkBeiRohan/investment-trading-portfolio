export interface BalanceData {
  amount: number;
  currency: string;
  change: number;
  changePercent: number;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  rate: number;
  name: string;
}
