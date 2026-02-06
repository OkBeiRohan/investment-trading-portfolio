import type { Transaction } from "../../_types";

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    name: "Henrik Jansen",
    type: "received",
    amount: 428.0,
    date: "2026-02-06T10:30:00Z",
  },
  {
    id: "2",
    name: "Multiplex",
    type: "paid",
    amount: -124.55,
    date: "2026-02-05T14:15:00Z",
  },
  {
    id: "3",
    name: "Eva Novak",
    type: "received",
    amount: 5710.2,
    date: "2026-02-04T09:00:00Z",
  },
  {
    id: "4",
    name: "Binance",
    type: "received",
    amount: 1714.29,
    date: "2026-02-03T16:45:00Z",
  },
  {
    id: "5",
    name: "Matteo Ricci",
    type: "received",
    amount: 536.0,
    date: "2026-02-02T11:20:00Z",
  },
  {
    id: "6",
    name: "Nike",
    type: "paid",
    amount: -328.96,
    date: "2026-02-01T08:00:00Z",
  },
];
