import { Injectable, Logger } from "@nestjs/common";
import { SocketState, SubscriptionRequest } from "./types";
import { SubscriptionPriorityQueue } from "./priority-queue";

@Injectable()
export class BinPacker {
  private readonly logger = new Logger(BinPacker.name);

  constructor(private evictionQueue: SubscriptionPriorityQueue) {}

  /**
   * Core Allocation Method
   * @param newItems - List of keys requesting subscription
   * @param sockets - Current state of active sockets
   * @returns Plan containing which socket gets which keys, and what to evict
   */
  public allocate(
    newItems: SubscriptionRequest[],
    sockets: SocketState[]
  ): {
    assignments: Map<string, string[]>; // SocketID -> Keys
    evictions: string[]; // Keys to unsubscribe
    unfulfilled: string[]; // Keys that couldn't be added
  } {
    const assignments = new Map<string, string[]>();
    const evictions: string[] = [];
    const unfulfilled: string[] = [];

    // Sort new items by priority (Highest Priority #1 first) to ensure critical items get first dibs
    // Note: Sort ASC because #1 < #4.
    newItems.sort((a, b) => a.priority - b.priority);

    for (const item of newItems) {
      let placed = false;

      // STRATEGY 1: First-Fit (Try to find space in existing sockets)
      for (const socket of sockets) {
        const plannedKeys = assignments.get(socket.id) || [];
        const projectedLoad = socket.load + plannedKeys.length;

        if (projectedLoad < socket.capacity) {
          this.addToAssignment(assignments, socket.id, item.instrumentKey);
          this.evictionQueue.enqueue(item); // Register in system state
          placed = true;
          break;
        }
      }

      // STRATEGY 2: Overflow / Eviction
      if (!placed) {
        // Check if we can evict someone
        const candidate = this.evictionQueue.peekEvictionCandidate();

        if (candidate && candidate.priority > item.priority) {
          // The candidate (e.g., Prio 4) is LESS important than new item (e.g., Prio 1).
          // Evict candidate.
          const evicted = this.evictionQueue.evict(); // Pop Prio 4
          if (evicted) {
            evictions.push(evicted.instrumentKey);

            // Find which socket held the evicted key (In real impl, we'd map this faster)
            const targetSocket = this.findSocketForKey(
              evicted.instrumentKey,
              sockets
            );

            if (targetSocket) {
              this.addToAssignment(
                assignments,
                targetSocket.id,
                item.instrumentKey
              );
              this.evictionQueue.enqueue(item); // Add Prio 1
              placed = true;
              this.logger.log(
                `Evicted ${evicted.instrumentKey} for ${item.instrumentKey}`
              );
            }
          }
        }
      }

      if (!placed) {
        unfulfilled.push(item.instrumentKey);
      }
    }

    return { assignments, evictions, unfulfilled };
  }

  private addToAssignment(
    map: Map<string, string[]>,
    socketId: string,
    key: string
  ) {
    if (!map.has(socketId)) {
      map.set(socketId, [key]);
    }
    map.get(socketId)?.push(key);
  }

  private findSocketForKey(
    key: string,
    sockets: SocketState[]
  ): SocketState | undefined {
    return sockets.find((s) => s.keys.has(key));
  }
}
