import { Injectable, Logger } from "@nestjs/common";
import {
  AllocationResult,
  PriorityLevel,
  SocketState,
  SubscriptionRequest,
} from "./types";
import { PriorityQueue } from "./priority-queue";

@Injectable()
export class BinPacker {
  private readonly logger = new Logger(BinPacker.name);

  constructor(private priorityQueue: PriorityQueue) {}

  // /**
  //  * First-Fit Decreasing bin packing with priority-based eviction
  //  */
  // allocate(
  //   requests: SubscriptionRequest[],
  //   sockets: SocketState[]
  // ): AllocationResult {
  //   // Sort requests by priority (CRITICAL first)
  //   const sortedRequests = [...requests].sort(
  //     (a, b) => a.priority - b.priority
  //   );

  //   const assignments = new Map<string, string[]>();
  //   const evictions: string[] = [];
  //   const unfulfilled: string[] = [];

  //   for (const socket of sockets) {
  //     assignments.set(socket.id, []);
  //   }

  //   for (const request of sortedRequests) {
  //     let allocated = false;

  //     // Try First-Fit allocation
  //     for (const socket of sockets) {
  //       const currentLoad =
  //         socket.load + (assignments.get(socket.id)?.length || 0);
  //       if (currentLoad < socket.capacity) {
  //         assignments.get(socket.id)!.push(request.instrumentKey);
  //         allocated = true;
  //         break;
  //       }
  //     }

  //     // If not allocated and priority is high enough, try eviction
  //     if (!allocated && request.priority <= PriorityLevel.MEDIUM) {
  //       const candidate = this.priorityQueue.peekEvictionCandidate();

  //       if (candidate && candidate.priority > request.priority) {
  //         // Evict lower priority item
  //         evictions.push(candidate.key);
  //         this.priorityQueue.popEvictionCandidate();

  //         // Try allocation again
  //         for (const socket of sockets) {
  //           const currentLoad =
  //             socket.load + (assignments.get(socket.id)?.length || 0);
  //           if (currentLoad < socket.capacity) {
  //             assignments.get(socket.id)!.push(request.instrumentKey);
  //             allocated = true;
  //             break;
  //           }
  //         }
  //       }
  //     }

  //     if (!allocated) {
  //       unfulfilled.push(request.instrumentKey);
  //       this.logger.warn(
  //         `Cannot allocate ${request.instrumentKey} (priority: ${request.priority})`
  //       );
  //     }
  //   }

  //   this.logger.debug(
  //     `Allocation complete: ${requests.length - unfulfilled.length}/${requests.length} allocated, ${evictions.length} evicted`
  //   );

  //   return {
  //     assignments,
  //     evictions,
  //     unfulfilled,
  //   };
  // }

  // /**
  //  * Best-Fit algorithm (minimizes wasted space)
  //  */
  // allocateBestFit(
  //   requests: SubscriptionRequest[],
  //   sockets: SocketState[]
  // ): AllocationResult {
  //   const sortedRequests = [...requests].sort(
  //     (a, b) => a.priority - b.priority
  //   );
  //   const assignments = new Map<string, string[]>();
  //   const unfulfilled: string[] = [];

  //   for (const socket of sockets) {
  //     assignments.set(socket.id, []);
  //   }

  //   for (const request of sortedRequests) {
  //     let bestSocket: SocketState | null = null;
  //     let minRemainingSpace = Infinity;

  //     // Find socket with minimum remaining space
  //     for (const socket of sockets) {
  //       const currentLoad =
  //         socket.load + (assignments.get(socket.id)?.length || 0);
  //       const remainingSpace = socket.capacity - currentLoad;

  //       if (remainingSpace > 0 && remainingSpace < minRemainingSpace) {
  //         minRemainingSpace = remainingSpace;
  //         bestSocket = socket;
  //       }
  //     }

  //     if (bestSocket) {
  //       assignments.get(bestSocket.id)!.push(request.instrumentKey);
  //     } else {
  //       unfulfilled.push(request.instrumentKey);
  //     }
  //   }

  //   return {
  //     assignments,
  //     evictions: [],
  //     unfulfilled,
  //   };
  // }
}
