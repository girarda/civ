/**
 * Tests for ProductionUI.
 * Note: ProductionUI requires DOM elements. These tests verify the core logic
 * by testing the underlying Buildable helpers it uses.
 * E2E tests will cover the full UI interaction.
 */

import { describe, it, expect } from 'vitest';
import {
  BuildableType,
  getAvailableBuildables,
  getBuildableName,
  getBuildableCost,
} from '../city/Buildable';

describe('ProductionUI buildable helpers', () => {
  describe('getAvailableBuildables', () => {
    it('should return all buildable types except None', () => {
      const buildables = getAvailableBuildables();
      expect(buildables).toHaveLength(3);
      expect(buildables).toContain(BuildableType.Warrior);
      expect(buildables).toContain(BuildableType.Scout);
      expect(buildables).toContain(BuildableType.Settler);
      expect(buildables).not.toContain(BuildableType.None);
    });
  });

  describe('getBuildableName', () => {
    it('should return correct names for all types', () => {
      expect(getBuildableName(BuildableType.None)).toBe('None');
      expect(getBuildableName(BuildableType.Warrior)).toBe('Warrior');
      expect(getBuildableName(BuildableType.Scout)).toBe('Scout');
      expect(getBuildableName(BuildableType.Settler)).toBe('Settler');
    });
  });

  describe('getBuildableCost', () => {
    it('should return correct costs for all types', () => {
      expect(getBuildableCost(BuildableType.None)).toBe(0);
      expect(getBuildableCost(BuildableType.Warrior)).toBe(40);
      expect(getBuildableCost(BuildableType.Scout)).toBe(25);
      expect(getBuildableCost(BuildableType.Settler)).toBe(80);
    });
  });

  describe('button labels', () => {
    it('should format button labels correctly with name and cost', () => {
      const buildables = getAvailableBuildables();
      const labels = buildables.map((b) => {
        const name = getBuildableName(b);
        const cost = getBuildableCost(b);
        return `${name} (${cost})`;
      });

      expect(labels).toContain('Warrior (40)');
      expect(labels).toContain('Scout (25)');
      expect(labels).toContain('Settler (80)');
    });
  });
});
