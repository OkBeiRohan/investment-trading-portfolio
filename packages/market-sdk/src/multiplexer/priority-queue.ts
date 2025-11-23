import { Injectable } from "@nestjs/common";
import { PriorityLevel, SubscriptionMetadata } from "./types";

interface PriorityQueueNode {
  key: string;
  priority: PriorityLevel;
  timestamp: Date;
}

@Injectable()
export class PriorityQueue {
  private queue: PriorityQueueNode[] = [];

  // insert(key: string, priority: PriorityLevel): void {
  //   const node: PriorityQueueNode = {
  //     key,
  //     priority,
  //     timestamp: new Date(),
  //   };

  //   // Insert in priority order (higher priority number = lower priority)
  //   let insertIndex = 0;
  //   for (let i = 0; i < this.queue.length; i++) {
  //     if (this.queue[i].priority > priority) {
  //       insertIndex = i;
  //       break;
  //     }
  //     if (this.queue[i].priority === priority) {
  //       // Same priority, use FIFO (older first)
  //       if (this.queue[i].timestamp > node.timestamp) {
  //         insertIndex = i;
  //         break;
  //       }
  //     }
  //     insertIndex = i + 1;
  //   }

  //   this.queue.splice(insertIndex, 0, node);
  // }

  // remove(key: string): boolean {
  //   const index = this.queue.findIndex((n) => n.key === key);
  //   if (index !== -1) {
  //     this.queue.splice(index, 1);
  //     return true;
  //   }
  //   return false;
  // }

  // peekEvictionCandidate(): PriorityQueueNode | null {
  //   // Return lowest priority item (end of queue)
  //   return this.queue.length > 0 ? this.queue[this.queue.length - 1] : null;
  // }

  // popEvictionCandidate(): PriorityQueueNode | null {
  //   return this.queue.pop() || null;
  // }

  // getByPriority(priority: PriorityLevel): PriorityQueueNode[] {
  //   return this.queue.filter((n) => n.priority === priority);
  // }

  // size(): number {
  //   return this.queue.length;
  // }

  // clear(): void {
  //   this.queue = [];
  // }

  // toArray(): PriorityQueueNode[] {
  //   return [...this.queue];
  // }
}
