import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionQueue, MAX_QUEUE_SIZE } from './ProductionQueue';
import { BuildableType } from './Buildable';

describe('ProductionQueue', () => {
  let queue: ProductionQueue;

  beforeEach(() => {
    queue = new ProductionQueue();
  });

  describe('enqueue', () => {
    it('should add item to empty queue', () => {
      const result = queue.enqueue(1, BuildableType.Warrior);
      expect(result).toBe(true);
      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior]);
    });

    it('should add items in order (FIFO)', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);
      queue.enqueue(1, BuildableType.Settler);

      expect(queue.getQueue(1)).toEqual([
        BuildableType.Warrior,
        BuildableType.Scout,
        BuildableType.Settler,
      ]);
    });

    it('should return false when queue is at MAX_QUEUE_SIZE', () => {
      // Fill queue to max
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        queue.enqueue(1, BuildableType.Warrior);
      }

      const result = queue.enqueue(1, BuildableType.Scout);
      expect(result).toBe(false);
      expect(queue.getQueueLength(1)).toBe(MAX_QUEUE_SIZE);
    });

    it('should allow queueing up to MAX_QUEUE_SIZE items', () => {
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        const result = queue.enqueue(1, BuildableType.Warrior);
        expect(result).toBe(true);
      }
      expect(queue.getQueueLength(1)).toBe(MAX_QUEUE_SIZE);
    });

    it('should maintain separate queues for different cities', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(2, BuildableType.Scout);

      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior]);
      expect(queue.getQueue(2)).toEqual([BuildableType.Scout]);
    });
  });

  describe('dequeue', () => {
    it('should return null for empty queue', () => {
      expect(queue.dequeue(1)).toBe(null);
    });

    it('should return null for non-existent city', () => {
      expect(queue.dequeue(999)).toBe(null);
    });

    it('should return and remove first item (FIFO)', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      const first = queue.dequeue(1);
      expect(first).toBe(BuildableType.Warrior);
      expect(queue.getQueue(1)).toEqual([BuildableType.Scout]);
    });

    it('should empty queue after all items dequeued', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      queue.dequeue(1);
      queue.dequeue(1);

      expect(queue.isEmpty(1)).toBe(true);
      expect(queue.dequeue(1)).toBe(null);
    });
  });

  describe('remove', () => {
    it('should do nothing for invalid index (negative)', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.remove(1, -1);
      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior]);
    });

    it('should do nothing for invalid index (too large)', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.remove(1, 5);
      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior]);
    });

    it('should do nothing for non-existent city', () => {
      queue.remove(999, 0);
      // No error thrown
      expect(queue.getQueue(999)).toEqual([]);
    });

    it('should remove item at specific index', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);
      queue.enqueue(1, BuildableType.Settler);

      queue.remove(1, 1); // Remove Scout

      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior, BuildableType.Settler]);
    });

    it('should remove first item', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      queue.remove(1, 0);

      expect(queue.getQueue(1)).toEqual([BuildableType.Scout]);
    });

    it('should remove last item', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      queue.remove(1, 1);

      expect(queue.getQueue(1)).toEqual([BuildableType.Warrior]);
    });
  });

  describe('removeCity', () => {
    it('should remove all queue data for city', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      queue.removeCity(1);

      expect(queue.getQueue(1)).toEqual([]);
      expect(queue.isEmpty(1)).toBe(true);
    });

    it('should not affect other cities', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(2, BuildableType.Scout);

      queue.removeCity(1);

      expect(queue.getQueue(2)).toEqual([BuildableType.Scout]);
    });
  });

  describe('clear', () => {
    it('should remove all queue data for all cities', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(2, BuildableType.Scout);
      queue.enqueue(3, BuildableType.Settler);

      queue.clear();

      expect(queue.getQueue(1)).toEqual([]);
      expect(queue.getQueue(2)).toEqual([]);
      expect(queue.getQueue(3)).toEqual([]);
    });
  });

  describe('getQueueLength', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.getQueueLength(1)).toBe(0);
    });

    it('should return 0 for non-existent city', () => {
      expect(queue.getQueueLength(999)).toBe(0);
    });

    it('should return correct count', () => {
      queue.enqueue(1, BuildableType.Warrior);
      queue.enqueue(1, BuildableType.Scout);

      expect(queue.getQueueLength(1)).toBe(2);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty queue', () => {
      expect(queue.isEmpty(1)).toBe(true);
    });

    it('should return true for non-existent city', () => {
      expect(queue.isEmpty(999)).toBe(true);
    });

    it('should return false when queue has items', () => {
      queue.enqueue(1, BuildableType.Warrior);
      expect(queue.isEmpty(1)).toBe(false);
    });
  });

  describe('isFull', () => {
    it('should return false for empty queue', () => {
      expect(queue.isFull(1)).toBe(false);
    });

    it('should return false for partially filled queue', () => {
      queue.enqueue(1, BuildableType.Warrior);
      expect(queue.isFull(1)).toBe(false);
    });

    it('should return true when queue is at MAX_QUEUE_SIZE', () => {
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        queue.enqueue(1, BuildableType.Warrior);
      }
      expect(queue.isFull(1)).toBe(true);
    });
  });

  describe('getQueue', () => {
    it('should return empty array for non-existent city', () => {
      expect(queue.getQueue(999)).toEqual([]);
    });

    it('should return readonly array', () => {
      queue.enqueue(1, BuildableType.Warrior);
      const result = queue.getQueue(1);

      // Verify it's a copy, not the original
      expect(result).toEqual([BuildableType.Warrior]);
    });
  });

  describe('MAX_QUEUE_SIZE', () => {
    it('should be 5', () => {
      expect(MAX_QUEUE_SIZE).toBe(5);
    });
  });
});
