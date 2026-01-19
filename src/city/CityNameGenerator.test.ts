import { describe, it, expect } from 'vitest';
import { getNextCityName, getCityNameByIndex, getCityNameCount } from './CityNameGenerator';
import { DEFAULT_CITY_NAMES } from './CityData';

describe('CityNameGenerator', () => {
  describe('getNextCityName', () => {
    it('should return first name for first city', () => {
      expect(getNextCityName(0)).toBe('Capital');
    });

    it('should return second name for second city', () => {
      expect(getNextCityName(1)).toBe('Alexandria');
    });

    it('should cycle through names when count exceeds list', () => {
      const count = DEFAULT_CITY_NAMES.length;
      expect(getNextCityName(count)).toBe(DEFAULT_CITY_NAMES[0]);
      expect(getNextCityName(count + 1)).toBe(DEFAULT_CITY_NAMES[1]);
    });
  });

  describe('getCityNameByIndex', () => {
    it('should return correct name for index', () => {
      expect(getCityNameByIndex(0)).toBe('Capital');
      expect(getCityNameByIndex(1)).toBe('Alexandria');
      expect(getCityNameByIndex(2)).toBe('Memphis');
    });

    it('should cycle for indices beyond list length', () => {
      const count = DEFAULT_CITY_NAMES.length;
      expect(getCityNameByIndex(count)).toBe(DEFAULT_CITY_NAMES[0]);
      expect(getCityNameByIndex(count * 2 + 3)).toBe(DEFAULT_CITY_NAMES[3]);
    });
  });

  describe('getCityNameCount', () => {
    it('should return the number of available city names', () => {
      expect(getCityNameCount()).toBe(DEFAULT_CITY_NAMES.length);
      expect(getCityNameCount()).toBeGreaterThan(0);
    });
  });
});
