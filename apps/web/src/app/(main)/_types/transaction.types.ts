export type TransactionType = "received" | "paid" | "transfer";

export interface Transaction {
  id: string;
  name: string;
  avatar?: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
}
