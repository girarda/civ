import { describe, it, expect } from 'vitest';
import {
  FOOD_PER_POPULATION,
  INITIAL_TERRITORY_RADIUS,
  BASE_GROWTH_THRESHOLD,
  GROWTH_THRESHOLD_MULTIPLIER,
  calculateGrowthThreshold,
  DEFAULT_CITY_NAMES,
} from './CityData';

describe('CityData', () => {
  describe('constants', () => {
    it('should have correct FOOD_PER_POPULATION value', () => {
      expect(FOOD_PER_POPULATION).toBe(2);
    });

    it('should have correct INITIAL_TERRITORY_RADIUS value', () => {
      expect(INITIAL_TERRITORY_RADIUS).toBe(1);
    });

    it('should have correct BASE_GROWTH_THRESHOLD value', () => {
      expect(BASE_GROWTH_THRESHOLD).toBe(15);
    });

    it('should have correct GROWTH_THRESHOLD_MULTIPLIER value', () => {
      expect(GROWTH_THRESHOLD_MULTIPLIER).toBe(6);
    });

    it('should have default city names', () => {
      expect(DEFAULT_CITY_NAMES.length).toBeGreaterThan(0);
      expect(DEFAULT_CITY_NAMES[0]).toBe('Capital');
    });
  });

  describe('calculateGrowthThreshold', () => {
    it('should calculate threshold for population 1', () => {
      // BASE (15) + 1 * MULTIPLIER (6) = 21
      expect(calculateGrowthThreshold(1)).toBe(21);
    });

    it('should calculate threshold for population 2', () => {
      // BASE (15) + 2 * MULTIPLIER (6) = 27
      expect(calculateGrowthThreshold(2)).toBe(27);
    });

    it('should calculate threshold for population 5', () => {
      // BASE (15) + 5 * MULTIPLIER (6) = 45
      expect(calculateGrowthThreshold(5)).toBe(45);
    });

    it('should calculate threshold for population 10', () => {
      // BASE (15) + 10 * MULTIPLIER (6) = 75
      expect(calculateGrowthThreshold(10)).toBe(75);
    });

    it('should scale linearly with population', () => {
      const threshold1 = calculateGrowthThreshold(1);
      const threshold2 = calculateGrowthThreshold(2);
      const threshold3 = calculateGrowthThreshold(3);

      expect(threshold2 - threshold1).toBe(GROWTH_THRESHOLD_MULTIPLIER);
      expect(threshold3 - threshold2).toBe(GROWTH_THRESHOLD_MULTIPLIER);
    });
  });
});
