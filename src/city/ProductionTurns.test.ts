import { describe, it, expect } from 'vitest';
import { calculateTurnsToComplete, calculateQueueTurns } from './ProductionTurns';

describe('calculateTurnsToComplete', () => {
  it('should calculate turns for partial progress', () => {
    // 30 remaining, 5 per turn = 6 turns
    expect(calculateTurnsToComplete(10, 40, 5)).toBe(6);
  });

  it('should return 0 for completed production', () => {
    expect(calculateTurnsToComplete(40, 40, 5)).toBe(0);
  });

  it('should return 0 when progress exceeds cost', () => {
    expect(calculateTurnsToComplete(50, 40, 5)).toBe(0);
  });

  it('should return Infinity for zero production yield', () => {
    expect(calculateTurnsToComplete(0, 40, 0)).toBe(Infinity);
  });

  it('should return Infinity for negative production yield', () => {
    expect(calculateTurnsToComplete(0, 40, -5)).toBe(Infinity);
  });

  it('should round up partial turns', () => {
    // 35 remaining, 10 per turn = 3.5 -> 4 turns
    expect(calculateTurnsToComplete(5, 40, 10)).toBe(4);
  });

  it('should handle exact division', () => {
    // 40 remaining, 10 per turn = 4 turns exactly
    expect(calculateTurnsToComplete(0, 40, 10)).toBe(4);
  });

  it('should return 1 for nearly complete production', () => {
    // 1 remaining, 10 per turn = 1 turn
    expect(calculateTurnsToComplete(39, 40, 10)).toBe(1);
  });
});

describe('calculateQueueTurns', () => {
  it('should calculate turns for current item only', () => {
    // Current: 30 remaining, 5 per turn = 6 turns
    const result = calculateQueueTurns(10, 40, [], 5);
    expect(result).toEqual([6]);
  });

  it('should return Infinity for zero production', () => {
    const result = calculateQueueTurns(0, 40, [40, 40], 0);
    expect(result).toEqual([Infinity, Infinity, Infinity]);
  });

  it('should calculate cumulative turns for queued items', () => {
    // Current: 40 cost, 0 progress, 10 per turn = 4 turns
    // Queue item 1: 40 cost, 10 per turn = 4 turns (cumulative: 8)
    const result = calculateQueueTurns(0, 40, [40], 10);
    expect(result[0]).toBe(4); // Current item
    expect(result[1]).toBe(8); // First queued item (cumulative)
  });

  it('should apply overflow capped at 50%', () => {
    // Current: 30 cost, 0 progress, 10 per turn = 3 turns
    // Total produced: 30, overflow: 0
    // Queue item: 40 cost, overflow cap = 20 (50% of 40)
    // Effective: 40 remaining, 10 per turn = 4 turns (cumulative: 7)
    const result = calculateQueueTurns(0, 30, [40], 10);
    expect(result[0]).toBe(3);
    expect(result[1]).toBe(7);
  });

  it('should handle overflow exceeding cap', () => {
    // Current: 40 cost, 35 progress, 20 per turn = 1 turn (produces 40-35=5 needed, 20 produced)
    // Total produced: 35 + 20 = 55, cost = 40, overflow = 15
    // Queue item: 20 cost, overflow cap = 10 (50% of 20)
    // Starting progress: 10 (capped), remaining: 10, turns: 1
    // Cumulative: 1 + 1 = 2
    const result = calculateQueueTurns(35, 40, [20], 20);
    expect(result[0]).toBe(1); // Current item completes in 1 turn
    expect(result[1]).toBe(2); // Queue item with capped overflow
  });

  it('should handle multiple queued items with cascading overflow', () => {
    // Production: 10 per turn
    // Current: 20 cost, 0 progress = 2 turns (produces 20, overflow: 0)
    // Queue 1: 20 cost, cap = 10, starting = 0, remaining = 20, = 2 turns (cumulative: 4)
    // Queue 2: 20 cost, cap = 10, starting = 0, remaining = 20, = 2 turns (cumulative: 6)
    const result = calculateQueueTurns(0, 20, [20, 20], 10);
    expect(result).toEqual([2, 4, 6]);
  });

  it('should handle items with different costs', () => {
    // Production: 10 per turn
    // Current: 30 cost, 0 progress = 3 turns (produces 30, overflow: 0)
    // Queue 1: 50 cost, cap = 25, starting = 0, remaining = 50, = 5 turns (cumulative: 8)
    // Queue 2: 20 cost, cap = 10, starting = 0, remaining = 20, = 2 turns (cumulative: 10)
    const result = calculateQueueTurns(0, 30, [50, 20], 10);
    expect(result).toEqual([3, 8, 10]);
  });

  it('should apply overflow from previous queue item', () => {
    // Production: 10 per turn
    // Current: 15 cost, 0 progress = 2 turns (produces 20, overflow: 5)
    // Queue 1: 20 cost, cap = 10, starting = 5 (within cap), remaining = 15, = 2 turns (produces 20, overflow: 5)
    // Cumulative: 2 + 2 = 4
    // Queue 2: 30 cost, cap = 15, starting = 5 (within cap), remaining = 25, = 3 turns
    // Cumulative: 4 + 3 = 7
    const result = calculateQueueTurns(0, 15, [20, 30], 10);
    expect(result[0]).toBe(2);
    expect(result[1]).toBe(4);
    expect(result[2]).toBe(7);
  });
});
