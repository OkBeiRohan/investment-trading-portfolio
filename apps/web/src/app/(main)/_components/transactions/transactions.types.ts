import type { Transaction } from "../../_types";

export interface TransactionsListProps {
  transactions: Transaction[];
  title?: string;
}

export interface TransactionItemProps {
  transaction: Transaction;
}

export interface TransactionAmountProps {
  amount: number;
  type: "received" | "paid" | "transfer";
}
