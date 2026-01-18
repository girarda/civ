import { describe, it, expect } from 'vitest';
import { HexGridLayout } from './HexGridLayout';
import { TilePosition } from './TilePosition';

describe('HexGridLayout', () => {
  describe('constructor', () => {
    it('should create layout with default size 32', () => {
      const layout = new HexGridLayout();
      expect(layout.hexSize.x).toBe(32);
      expect(layout.hexSize.y).toBe(32);
    });

    it('should create layout with custom size', () => {
      const layout = new HexGridLayout(64);
      expect(layout.hexSize.x).toBe(64);
      expect(layout.hexSize.y).toBe(64);
    });

    it('should create layout with default origin at (0,0)', () => {
      const layout = new HexGridLayout();
      expect(layout.origin.x).toBe(0);
      expect(layout.origin.y).toBe(0);
    });

    it('should create layout with custom origin', () => {
      const layout = new HexGridLayout(32, { x: 100, y: 200 });
      expect(layout.origin.x).toBe(100);
      expect(layout.origin.y).toBe(200);
    });

    it('should use pointy orientation', () => {
      const layout = new HexGridLayout();
      expect(layout.orientation).toBe('pointy');
    });
  });

  describe('hexToWorld', () => {
    it('should convert origin hex to origin world position', () => {
      const layout = new HexGridLayout(32);
      const pos = layout.hexToWorld(TilePosition.ORIGIN);
      expect(pos.x).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(0);
    });

    it('should convert hex with only q offset', () => {
      const layout = new HexGridLayout(32);
      const hex = new TilePosition(1, 0);
      const pos = layout.hexToWorld(hex);
      // For pointy-top: x = size * sqrt(3) * q
      expect(pos.x).toBeCloseTo(32 * Math.sqrt(3));
      expect(pos.y).toBeCloseTo(0);
    });

    it('should convert hex with only r offset', () => {
      const layout = new HexGridLayout(32);
      const hex = new TilePosition(0, 1);
      const pos = layout.hexToWorld(hex);
      // For pointy-top: x = size * sqrt(3)/2 * r, y = size * 3/2 * r
      expect(pos.x).toBeCloseTo(32 * (Math.sqrt(3) / 2));
      expect(pos.y).toBeCloseTo(32 * 1.5);
    });

    it('should apply origin offset', () => {
      const layout = new HexGridLayout(32, { x: 100, y: 50 });
      const pos = layout.hexToWorld(TilePosition.ORIGIN);
      expect(pos.x).toBeCloseTo(100);
      expect(pos.y).toBeCloseTo(50);
    });
  });

  describe('worldToHex', () => {
    it('should convert origin world to origin hex', () => {
      const layout = new HexGridLayout(32);
      const hex = layout.worldToHex({ x: 0, y: 0 });
      expect(hex.q).toBe(0);
      expect(hex.r).toBe(0);
    });

    it('should be inverse of hexToWorld for center of hex', () => {
      const layout = new HexGridLayout(32);
      const originalHex = new TilePosition(3, -2);
      const worldPos = layout.hexToWorld(originalHex);
      const convertedHex = layout.worldToHex(worldPos);
      expect(convertedHex.equals(originalHex)).toBe(true);
    });

    it('should round to nearest hex for positions between hexes', () => {
      const layout = new HexGridLayout(32);
      // Slightly offset from center should still round to same hex
      const hex = new TilePosition(2, 1);
      const center = layout.hexToWorld(hex);
      const nearCenter = { x: center.x + 5, y: center.y + 5 };
      const rounded = layout.worldToHex(nearCenter);
      expect(rounded.equals(hex)).toBe(true);
    });

    it('should handle origin offset', () => {
      const layout = new HexGridLayout(32, { x: 100, y: 50 });
      const hex = layout.worldToHex({ x: 100, y: 50 });
      expect(hex.q).toBe(0);
      expect(hex.r).toBe(0);
    });
  });

  describe('hexCorners', () => {
    it('should return 6 corners', () => {
      const layout = new HexGridLayout(32);
      const corners = layout.hexCorners(TilePosition.ORIGIN);
      expect(corners).toHaveLength(6);
    });

    it('should have corners at correct distance from center', () => {
      const layout = new HexGridLayout(32);
      const hex = TilePosition.ORIGIN;
      const center = layout.hexToWorld(hex);
      const corners = layout.hexCorners(hex);

      for (const corner of corners) {
        const dx = corner.x - center.x;
        const dy = corner.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeCloseTo(32);
      }
    });

    it('should have corners evenly spaced (60 degrees apart)', () => {
      const layout = new HexGridLayout(32);
      const center = layout.hexToWorld(TilePosition.ORIGIN);
      const corners = layout.hexCorners(TilePosition.ORIGIN);

      const angles = corners.map((c) => {
        const dx = c.x - center.x;
        const dy = c.y - center.y;
        return Math.atan2(dy, dx);
      });

      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        let diff = angles[next] - angles[i];
        if (diff < 0) diff += 2 * Math.PI;
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        expect(diff).toBeCloseTo(Math.PI / 3, 5); // 60 degrees
      }
    });
  });

  describe('hexEdgeMidpoints', () => {
    it('should return 6 midpoints', () => {
      const layout = new HexGridLayout(32);
      const midpoints = layout.hexEdgeMidpoints(TilePosition.ORIGIN);
      expect(midpoints).toHaveLength(6);
    });

    it('should have midpoints between corners', () => {
      const layout = new HexGridLayout(32);
      const corners = layout.hexCorners(TilePosition.ORIGIN);
      const midpoints = layout.hexEdgeMidpoints(TilePosition.ORIGIN);

      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const expectedX = (corners[i].x + corners[next].x) / 2;
        const expectedY = (corners[i].y + corners[next].y) / 2;
        expect(midpoints[i].x).toBeCloseTo(expectedX);
        expect(midpoints[i].y).toBeCloseTo(expectedY);
      }
    });
  });
});
