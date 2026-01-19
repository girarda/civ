/**
 * Production queue management for cities.
 * Uses Map-based storage since bitECS components cannot store arrays.
 */

import { BuildableType } from './Buildable';

/** Maximum number of items that can be queued per city */
export const MAX_QUEUE_SIZE = 5;

/**
 * Manages production queues for cities.
 * Tracks queued items using external Map storage.
 */
export class ProductionQueue {
  /** Map from city entity ID to array of queued items */
  private queues: Map<number, BuildableType[]> = new Map();

  /**
   * Get the production queue for a city.
   * Returns empty array if city has no queue.
   */
  getQueue(cityEid: number): readonly BuildableType[] {
    return this.queues.get(cityEid) ?? [];
  }

  /**
   * Add an item to a city's production queue.
   * Returns false if queue is at maximum capacity.
   */
  enqueue(cityEid: number, item: BuildableType): boolean {
    const queue = this.queues.get(cityEid) ?? [];
    if (queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }
    this.queues.set(cityEid, [...queue, item]);
    return true;
  }

  /**
   * Remove and return the first item from a city's queue.
   * Returns null if queue is empty.
   */
  dequeue(cityEid: number): BuildableType | null {
    const queue = this.queues.get(cityEid);
    if (!queue || queue.length === 0) return null;
    const [first, ...rest] = queue;
    this.queues.set(cityEid, rest);
    return first;
  }

  /**
   * Remove an item at a specific index from a city's queue.
   */
  remove(cityEid: number, index: number): void {
    const queue = this.queues.get(cityEid);
    if (!queue || index < 0 || index >= queue.length) return;
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    this.queues.set(cityEid, newQueue);
  }

  /**
   * Remove all queue data for a city.
   * Call when city is destroyed.
   */
  removeCity(cityEid: number): void {
    this.queues.delete(cityEid);
  }

  /**
   * Clear all queue data.
   * Call on map regeneration.
   */
  clear(): void {
    this.queues.clear();
  }

  /**
   * Get the number of items queued for a city.
   */
  getQueueLength(cityEid: number): number {
    return this.queues.get(cityEid)?.length ?? 0;
  }

  /**
   * Check if a city's queue is empty.
   */
  isEmpty(cityEid: number): boolean {
    return this.getQueueLength(cityEid) === 0;
  }

  /**
   * Check if a city's queue is at maximum capacity.
   */
  isFull(cityEid: number): boolean {
    return this.getQueueLength(cityEid) >= MAX_QUEUE_SIZE;
  }
}
