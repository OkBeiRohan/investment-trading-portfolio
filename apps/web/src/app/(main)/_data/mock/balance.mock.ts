import type { BalanceData, CurrencyRate } from "../../_types";

export const mockBalance: BalanceData = {
  amount: 26887.09,
  currency: "USD",
  change: 421.03,
  changePercent: 1.59,
};

export const mockCurrencyRates: CurrencyRate[] = [
  { code: "EUR", symbol: "€", rate: 0.97, name: "Euro" },
  { code: "GBP", symbol: "£", rate: 0.82, name: "British Pound" },
  { code: "CHF", symbol: "F", rate: 1.1, name: "Swiss Franc" },
];
