import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HoverSystem } from './HoverSystem';
import { HoverState } from './HoverState';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { GeneratedTile } from '../map/MapGenerator';

// Mock CameraController
const createMockCamera = (position = { x: 0, y: 0 }, zoom = 1.0) => ({
  getPosition: vi.fn(() => position),
  getZoom: vi.fn(() => zoom),
});

describe('HoverSystem', () => {
  let layout: HexGridLayout;
  let tileMap: Map<string, GeneratedTile>;
  let hoverState: HoverState;

  beforeEach(() => {
    layout = new HexGridLayout(32);
    tileMap = new Map();
    hoverState = new HoverState();
  });

  const addTile = (q: number, r: number, terrain: Terrain = Terrain.Grassland) => {
    const position = new TilePosition(q, r);
    const tile: GeneratedTile = { position, terrain, feature: null };
    tileMap.set(position.key(), tile);
    return tile;
  };

  describe('screenToWorld', () => {
    it('should convert screen coords with no camera offset and zoom 1', () => {
      const camera = createMockCamera({ x: 0, y: 0 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(100, 200);
      expect(world.x).toBe(100);
      expect(world.y).toBe(200);
    });

    it('should account for camera position offset', () => {
      const camera = createMockCamera({ x: 50, y: 100 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(150, 200);
      expect(world.x).toBe(100); // 150 - 50
      expect(world.y).toBe(100); // 200 - 100
    });

    it('should account for zoom level', () => {
      const camera = createMockCamera({ x: 0, y: 0 }, 2.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(200, 400);
      expect(world.x).toBe(100); // 200 / 2
      expect(world.y).toBe(200); // 400 / 2
    });

    it('should combine camera offset and zoom', () => {
      const camera = createMockCamera({ x: 100, y: 100 }, 2.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(300, 500);
      // (300 - 100) / 2 = 100
      // (500 - 100) / 2 = 200
      expect(world.x).toBe(100);
      expect(world.y).toBe(200);
    });

    it('should handle minimum zoom (0.5x)', () => {
      const camera = createMockCamera({ x: 0, y: 0 }, 0.5);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(100, 100);
      expect(world.x).toBe(200); // 100 / 0.5
      expect(world.y).toBe(200);
    });

    it('should handle maximum zoom (3.0x)', () => {
      const camera = createMockCamera({ x: 0, y: 0 }, 3.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const world = system.screenToWorld(300, 300);
      expect(world.x).toBe(100); // 300 / 3
      expect(world.y).toBe(100);
    });
  });

  describe('handleMouseMove', () => {
    it('should return hovered tile when cursor is over a tile', () => {
      const tile = addTile(0, 0);
      const camera = createMockCamera({ x: 0, y: 0 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      // Mouse at origin should hit tile (0, 0)
      const event = { clientX: 0, clientY: 0 } as MouseEvent;
      const result = system.handleMouseMove(event);

      expect(result).not.toBeNull();
      expect(result!.position.equals(tile.position)).toBe(true);
      expect(result!.terrain).toBe(Terrain.Grassland);
    });

    it('should return null when cursor is off-map', () => {
      // No tiles added to map
      const camera = createMockCamera({ x: 0, y: 0 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const event = { clientX: 0, clientY: 0 } as MouseEvent;
      const result = system.handleMouseMove(event);

      expect(result).toBeNull();
    });

    it('should update hover state', () => {
      const tile = addTile(0, 0);
      const camera = createMockCamera({ x: 0, y: 0 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const event = { clientX: 0, clientY: 0 } as MouseEvent;
      system.handleMouseMove(event);

      const hoveredTile = hoverState.get();
      expect(hoveredTile).not.toBeNull();
      expect(hoveredTile!.position.equals(tile.position)).toBe(true);
    });

    it('should clear hover state when moving off-map', () => {
      addTile(0, 0);
      const camera = createMockCamera({ x: 0, y: 0 }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      // First, hover over tile
      const event1 = { clientX: 0, clientY: 0 } as MouseEvent;
      system.handleMouseMove(event1);
      expect(hoverState.get()).not.toBeNull();

      // Then move to position with no tile
      const event2 = { clientX: 10000, clientY: 10000 } as MouseEvent;
      system.handleMouseMove(event2);
      expect(hoverState.get()).toBeNull();
    });

    it('should correctly identify tiles with camera offset', () => {
      // Add tile at (1, 1)
      const tile = addTile(1, 1);
      const worldPos = layout.hexToWorld(tile.position);

      // Camera is positioned so tile's world pos appears at screen (0, 0)
      const camera = createMockCamera({ x: -worldPos.x, y: -worldPos.y }, 1.0);
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      // Mouse at screen origin should now hit tile (1, 1) because camera moved
      // Actually, screenToWorld: world.x = (0 - (-worldPos.x)) / 1 = worldPos.x
      const event = { clientX: 0, clientY: 0 } as MouseEvent;
      const result = system.handleMouseMove(event);

      expect(result).not.toBeNull();
      expect(result!.position.q).toBe(1);
      expect(result!.position.r).toBe(1);
    });
  });

  describe('attach/detach', () => {
    it('should attach event listeners to canvas', () => {
      const camera = createMockCamera();
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const canvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      system.attach(canvas);

      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      );
    });

    it('should detach event listeners from canvas', () => {
      const camera = createMockCamera();
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const canvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      system.attach(canvas);
      system.detach();

      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function)
      );
    });
  });

  describe('destroy', () => {
    it('should detach and clear hover state', () => {
      addTile(0, 0);
      const camera = createMockCamera();
      const system = new HoverSystem(layout, camera as never, tileMap, hoverState);

      const canvas = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      system.attach(canvas);

      // Set some hover state
      const event = { clientX: 0, clientY: 0 } as MouseEvent;
      system.handleMouseMove(event);

      system.destroy();

      expect(canvas.removeEventListener).toHaveBeenCalled();
      expect(hoverState.get()).toBeNull();
    });
  });
});
