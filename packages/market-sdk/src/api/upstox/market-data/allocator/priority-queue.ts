import { Injectable } from "@nestjs/common";
import { PriorityLevel, SubscriptionRequest } from "./types";

/**
 * A Specialized Priority Queue for Market Data Subscriptions.
 *
 * PURPOSE:
 * When the multiplexer is full, we need to find the "Least Valuable" subscription to evict.
 * In our logic, Priority 4 (LOW) is the "best" candidate for eviction.
 *
 * We implement a Max-Heap based on Priority Level number (Higher number = Lower Importance).
 * So `peek()` will return the item with Priority 4 (Low Importance).
 */
@Injectable()
export class SubscriptionPriorityQueue {
  private heap: SubscriptionRequest[] = [];

  // Map to quickly check if a key exists in the queue/system
  private keyMap = new Map<string, number>(); // key -> heap index

  constructor() {}

  public enqueue(item: SubscriptionRequest): void {
    if (this.keyMap.has(item.instrumentKey)) {
      return; // Idempotency
    }
    this.heap.push(item);
    this.keyMap.set(item.instrumentKey, this.heap.length - 1);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Returns the best candidate for eviction (Lowest Priority / Highest Enum Value).
   */
  public peekEvictionCandidate(): SubscriptionRequest | undefined {
    return this.heap[0];
  }

  /**
   * Removes and returns the eviction candidate.
   */
  public evict(): SubscriptionRequest | undefined {
    if (this.heap.length === 0) return undefined;

    const root = this.heap[0];
    if (!root) return undefined;
    const last = this.heap.pop();
    this.keyMap.delete(root.instrumentKey);

    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.keyMap.set(last.instrumentKey, 0);
      this.sinkDown(0);
    }

    return root;
  }

  public size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    const element = this.heap[index];
    if (!element) return;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIndex];
      if (!parent) break;

      // If parent priority is LESS than element priority (meaning parent is MORE important),
      // and we want the LEAST important (Highest Number) at the top, we swap.
      // Example: Parent=2 (High), Child=4 (Low). 4 > 2. Swap so 4 is at root (ready to evict).
      if (element.priority <= parent.priority) break;

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const element = this.heap[index];
    if (!element) return;

    while (true) {
      let swapIndex: number | null = null;
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let leftChild: SubscriptionRequest | undefined,
        rightChild: SubscriptionRequest | undefined;

      if (leftChildIdx < length) {
        leftChild = this.heap[leftChildIdx];
        if (!leftChild) break;
        if (leftChild.priority > element.priority) {
          swapIndex = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.heap[rightChildIdx];
        if (!rightChild) break;
        if (
          (swapIndex === null && rightChild.priority > element.priority) ||
          (swapIndex !== null && rightChild.priority > leftChild!.priority)
        ) {
          swapIndex = rightChildIdx;
        }
      }

      if (swapIndex === null) break;

      this.swap(index, swapIndex);
      index = swapIndex;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    if (!temp || !this.heap[j]) return;
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.keyMap.set(this.heap[i].instrumentKey, i);
    this.keyMap.set(this.heap[j].instrumentKey, j);
  }
}
