export enum PriorityLevel {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

export interface SubscriptionRequest {
  instrumentKey: string;
  priority: PriorityLevel;
  userId: string;
  metadata?: Record<string, any>;
}

export interface SocketState {
  id: string;
  load: number;
  capacity: number;
  keys: string[];
}

export interface AllocationResult {
  assignments: Map<string, string[]>; // socketId -> instrumentKeys
  evictions: string[]; // instrumentKeys to evict
  unfulfilled: string[]; // instrumentKeys that couldn't be allocated
}

export interface SubscriptionMetadata {
  instrumentKey: string;
  userId: string;
  priority: PriorityLevel;
  subscribedAt: Date;
  socketId: string;
}

export interface SocketMetrics {
  id: string;
  load: number;
  capacity: number;
  utilization: number;
  subscriptions: number;
  connectedAt: Date;
  lastActivity: Date;
}
