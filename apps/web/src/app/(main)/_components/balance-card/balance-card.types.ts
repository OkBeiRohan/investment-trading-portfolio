import type { BalanceData } from "../../_types";

export interface BalanceCardProps {
  balance: BalanceData;
}

export interface BalanceDisplayProps {
  amount: number;
  currency: string;
  change: number;
}

export interface CurrencyBadgeProps {
  code: string;
  symbol: string;
  rate: number;
  name: string;
}

export interface ActionButtonsProps {
  onPay?: () => void;
  onTransfer?: () => void;
  onReceive?: () => void;
}
