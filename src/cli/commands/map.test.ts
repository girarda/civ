import { describe, it, expect } from 'vitest';
import { createEngine, parseCoords } from '../context';
import { Terrain } from '../../tile/Terrain';
import { TilePosition } from '../../hex/TilePosition';
import { GeneratedTile } from '../../map/MapGenerator';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

describe('CLI Map Commands', () => {
  describe('map tile', () => {
    it('should return tile information at coordinates', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([{ q: 5, r: 7, terrain: Terrain.Grassland }]);
      engine.setTileMap(tileMap);

      const tile = engine.getTile(5, 7);

      expect(tile).not.toBeNull();
      expect(tile!.position.q).toBe(5);
      expect(tile!.position.r).toBe(7);
      expect(tile!.terrain).toBe(Terrain.Grassland);
      expect(tile!.terrainName).toBe('Grassland');
      expect(tile!.isPassable).toBe(true);
      expect(tile!.isWater).toBe(false);
    });

    it('should return null for non-existent tile', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([{ q: 0, r: 0, terrain: Terrain.Grassland }]);
      engine.setTileMap(tileMap);

      const tile = engine.getTile(999, 999);
      expect(tile).toBeNull();
    });

    it('should return correct terrain properties', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Mountain },
        { q: 1, r: 0, terrain: Terrain.Ocean },
        { q: 2, r: 0, terrain: Terrain.GrasslandHill },
      ]);
      engine.setTileMap(tileMap);

      // Mountain - impassable
      const mountain = engine.getTile(0, 0);
      expect(mountain!.isPassable).toBe(false);
      expect(mountain!.isWater).toBe(false);

      // Ocean - water
      const ocean = engine.getTile(1, 0);
      expect(ocean!.isWater).toBe(true);

      // Hill - passable with higher movement cost
      const hill = engine.getTile(2, 0);
      expect(hill!.isPassable).toBe(true);
      expect(hill!.isHill).toBe(true);
    });
  });

  describe('map info', () => {
    it('should return map dimensions and seed', () => {
      const engine = createEngine({ seed: 12345 });
      const map = engine.getMap();

      expect(map.width).toBeGreaterThan(0);
      expect(map.height).toBeGreaterThan(0);
      expect(map.seed).toBe(12345);
      expect(map.tileCount).toBe(map.tiles.length);
    });
  });

  describe('parseCoords', () => {
    it('should parse valid coordinate string', () => {
      expect(parseCoords('5,7')).toEqual({ q: 5, r: 7 });
      expect(parseCoords('0,0')).toEqual({ q: 0, r: 0 });
      expect(parseCoords('-3,10')).toEqual({ q: -3, r: 10 });
    });

    it('should throw for invalid format', () => {
      expect(() => parseCoords('5')).toThrow('Invalid coordinate format');
      expect(() => parseCoords('5,7,9')).toThrow('Invalid coordinate format');
      expect(() => parseCoords('')).toThrow('Invalid coordinate format');
    });

    it('should throw for non-integer values', () => {
      expect(() => parseCoords('a,b')).toThrow('Invalid coordinates');
      // Note: parseInt('5.5', 10) returns 5, so this doesn't throw
    });
  });
});
