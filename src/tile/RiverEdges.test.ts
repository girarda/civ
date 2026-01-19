import { describe, it, expect } from 'vitest';
import { RiverEdges } from './RiverEdges';

describe('RiverEdges', () => {
  describe('static constants', () => {
    it('should have correct edge bit values', () => {
      expect(RiverEdges.EDGE_E).toBe(1);
      expect(RiverEdges.EDGE_NE).toBe(2);
      expect(RiverEdges.EDGE_NW).toBe(4);
      expect(RiverEdges.EDGE_W).toBe(8);
      expect(RiverEdges.EDGE_SW).toBe(16);
      expect(RiverEdges.EDGE_SE).toBe(32);
    });

    it('should have 6 edges in ALL_EDGES', () => {
      expect(RiverEdges.ALL_EDGES).toHaveLength(6);
    });

    it('should have NONE with no edges', () => {
      expect(RiverEdges.NONE.hasRiver()).toBe(false);
      expect(RiverEdges.NONE.getBits()).toBe(0);
    });

    it('should have ALL with all edges', () => {
      expect(RiverEdges.ALL.hasRiver()).toBe(true);
      expect(RiverEdges.ALL.edgeCount()).toBe(6);
      expect(RiverEdges.ALL.getBits()).toBe(0b00111111);
    });
  });

  describe('constructor', () => {
    it('should create with 0 bits by default', () => {
      const edges = new RiverEdges();
      expect(edges.getBits()).toBe(0);
    });

    it('should create with specified bits', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_W);
      expect(edges.getBits()).toBe(9); // 1 + 8
    });

    it('should mask to 6 bits', () => {
      const edges = new RiverEdges(0b11111111);
      expect(edges.getBits()).toBe(0b00111111);
    });
  });

  describe('fromEdges', () => {
    it('should create from array of edges', () => {
      const edges = RiverEdges.fromEdges([RiverEdges.EDGE_E, RiverEdges.EDGE_W]);
      expect(edges.hasEdge(RiverEdges.EDGE_E)).toBe(true);
      expect(edges.hasEdge(RiverEdges.EDGE_W)).toBe(true);
      expect(edges.hasEdge(RiverEdges.EDGE_NE)).toBe(false);
    });

    it('should handle empty array', () => {
      const edges = RiverEdges.fromEdges([]);
      expect(edges.equals(RiverEdges.NONE)).toBe(true);
    });

    it('should handle all edges', () => {
      const edges = RiverEdges.fromEdges(RiverEdges.ALL_EDGES);
      expect(edges.equals(RiverEdges.ALL)).toBe(true);
    });
  });

  describe('hasRiver', () => {
    it('should return false for no edges', () => {
      expect(new RiverEdges(0).hasRiver()).toBe(false);
    });

    it('should return true for any edge', () => {
      expect(new RiverEdges(RiverEdges.EDGE_E).hasRiver()).toBe(true);
      expect(new RiverEdges(RiverEdges.EDGE_SE).hasRiver()).toBe(true);
    });
  });

  describe('hasEdge', () => {
    it('should return true for set edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_NE);
      expect(edges.hasEdge(RiverEdges.EDGE_E)).toBe(true);
      expect(edges.hasEdge(RiverEdges.EDGE_NE)).toBe(true);
    });

    it('should return false for unset edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E);
      expect(edges.hasEdge(RiverEdges.EDGE_W)).toBe(false);
      expect(edges.hasEdge(RiverEdges.EDGE_NW)).toBe(false);
    });
  });

  describe('setEdge', () => {
    it('should return new RiverEdges with edge set', () => {
      const original = new RiverEdges(RiverEdges.EDGE_E);
      const modified = original.setEdge(RiverEdges.EDGE_W);

      expect(modified.hasEdge(RiverEdges.EDGE_E)).toBe(true);
      expect(modified.hasEdge(RiverEdges.EDGE_W)).toBe(true);
      // Original should be unchanged (immutable)
      expect(original.hasEdge(RiverEdges.EDGE_W)).toBe(false);
    });

    it('should be idempotent for already set edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E);
      const modified = edges.setEdge(RiverEdges.EDGE_E);
      expect(modified.getBits()).toBe(edges.getBits());
    });
  });

  describe('clearEdge', () => {
    it('should return new RiverEdges with edge cleared', () => {
      const original = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_W);
      const modified = original.clearEdge(RiverEdges.EDGE_E);

      expect(modified.hasEdge(RiverEdges.EDGE_E)).toBe(false);
      expect(modified.hasEdge(RiverEdges.EDGE_W)).toBe(true);
      // Original should be unchanged
      expect(original.hasEdge(RiverEdges.EDGE_E)).toBe(true);
    });

    it('should be idempotent for already clear edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E);
      const modified = edges.clearEdge(RiverEdges.EDGE_W);
      expect(modified.getBits()).toBe(edges.getBits());
    });
  });

  describe('toggleEdge', () => {
    it('should set unset edges', () => {
      const edges = new RiverEdges(0);
      const toggled = edges.toggleEdge(RiverEdges.EDGE_E);
      expect(toggled.hasEdge(RiverEdges.EDGE_E)).toBe(true);
    });

    it('should clear set edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E);
      const toggled = edges.toggleEdge(RiverEdges.EDGE_E);
      expect(toggled.hasEdge(RiverEdges.EDGE_E)).toBe(false);
    });
  });

  describe('edgeCount', () => {
    it('should return 0 for no edges', () => {
      expect(RiverEdges.NONE.edgeCount()).toBe(0);
    });

    it('should return correct count for single edge', () => {
      expect(new RiverEdges(RiverEdges.EDGE_E).edgeCount()).toBe(1);
    });

    it('should return correct count for multiple edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_W | RiverEdges.EDGE_NE);
      expect(edges.edgeCount()).toBe(3);
    });

    it('should return 6 for all edges', () => {
      expect(RiverEdges.ALL.edgeCount()).toBe(6);
    });
  });

  describe('iterEdges', () => {
    it('should return empty array for no edges', () => {
      expect(RiverEdges.NONE.iterEdges()).toEqual([]);
    });

    it('should return array of set edges', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_SW);
      const result = edges.iterEdges();
      expect(result).toContain(RiverEdges.EDGE_E);
      expect(result).toContain(RiverEdges.EDGE_SW);
      expect(result).toHaveLength(2);
    });

    it('should return all edges for ALL', () => {
      expect(RiverEdges.ALL.iterEdges()).toHaveLength(6);
    });
  });

  describe('oppositeEdge', () => {
    it('should return correct opposites', () => {
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_E)).toBe(RiverEdges.EDGE_W);
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_W)).toBe(RiverEdges.EDGE_E);
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_NE)).toBe(RiverEdges.EDGE_SW);
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_SW)).toBe(RiverEdges.EDGE_NE);
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_NW)).toBe(RiverEdges.EDGE_SE);
      expect(RiverEdges.oppositeEdge(RiverEdges.EDGE_SE)).toBe(RiverEdges.EDGE_NW);
    });

    it('should return 0 for invalid edge', () => {
      expect(RiverEdges.oppositeEdge(0)).toBe(0);
      expect(RiverEdges.oppositeEdge(64)).toBe(0);
    });
  });

  describe('equals', () => {
    it('should return true for same bits', () => {
      const a = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_W);
      const b = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_W);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different bits', () => {
      const a = new RiverEdges(RiverEdges.EDGE_E);
      const b = new RiverEdges(RiverEdges.EDGE_W);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return empty for no edges', () => {
      expect(RiverEdges.NONE.toString()).toBe('RiverEdges()');
    });

    it('should list edge names', () => {
      const edges = new RiverEdges(RiverEdges.EDGE_E | RiverEdges.EDGE_NW);
      const str = edges.toString();
      expect(str).toContain('E');
      expect(str).toContain('NW');
    });
  });
});
