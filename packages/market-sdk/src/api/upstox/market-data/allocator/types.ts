export enum PriorityLevel {
  CRITICAL = 1, // Indices, Futures
  HIGH = 2, // ATM, ITM
  MEDIUM = 3, // Near OTM
  LOW = 4, // Deep OTM
}

export interface SubscriptionRequest {
  instrumentKey: string;
  priority: PriorityLevel;
  metadata?: any; // Store expiry, strike for recalc
}

export interface SocketState {
  id: string;
  load: number; // Current number of keys
  capacity: number; // Max 5000
  keys: Set<string>;
}
