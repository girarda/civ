/**
 * Unit tests for Player types and constants.
 */

import { describe, it, expect } from 'vitest';
import { MAX_PLAYERS, PLAYER_COLORS } from './Player';

describe('Player constants', () => {
  describe('MAX_PLAYERS', () => {
    it('should equal 8', () => {
      expect(MAX_PLAYERS).toBe(8);
    });
  });

  describe('PLAYER_COLORS', () => {
    it('should have exactly 8 entries', () => {
      expect(PLAYER_COLORS.length).toBe(8);
    });

    it('should contain valid hex color numbers', () => {
      for (const color of PLAYER_COLORS) {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThanOrEqual(0x000000);
        expect(color).toBeLessThanOrEqual(0xffffff);
      }
    });

    it('should have distinct colors for each player', () => {
      const uniqueColors = new Set(PLAYER_COLORS);
      expect(uniqueColors.size).toBe(PLAYER_COLORS.length);
    });
  });
});
