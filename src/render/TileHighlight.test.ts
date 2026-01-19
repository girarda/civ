import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import { TileHighlight } from './TileHighlight';
import { TileRenderer } from './TileRenderer';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';

describe('TileHighlight', () => {
  let layout: HexGridLayout;
  let container: Container;

  beforeEach(() => {
    layout = new HexGridLayout(32);
    container = new Container();
  });

  describe('basic functionality', () => {
    it('should be hidden initially', () => {
      const highlight = new TileHighlight(container, layout);
      expect(highlight.isVisible()).toBe(false);
    });

    it('should be visible after show() is called', () => {
      const highlight = new TileHighlight(container, layout);
      const position = new TilePosition(0, 0);

      highlight.show(position);

      expect(highlight.isVisible()).toBe(true);
    });

    it('should be hidden after hide() is called', () => {
      const highlight = new TileHighlight(container, layout);
      const position = new TilePosition(0, 0);

      highlight.show(position);
      highlight.hide();

      expect(highlight.isVisible()).toBe(false);
    });

    it('should track current position', () => {
      const highlight = new TileHighlight(container, layout);
      const position = new TilePosition(2, 3);

      highlight.show(position);

      const current = highlight.getPosition();
      expect(current).not.toBeNull();
      expect(current!.q).toBe(2);
      expect(current!.r).toBe(3);
    });

    it('should clear position when hidden', () => {
      const highlight = new TileHighlight(container, layout);
      const position = new TilePosition(2, 3);

      highlight.show(position);
      highlight.hide();

      expect(highlight.getPosition()).toBeNull();
    });

    it('should add graphic to container', () => {
      expect(container.children.length).toBe(0);

      new TileHighlight(container, layout);

      expect(container.children.length).toBe(1);
    });
  });

  describe('container hierarchy', () => {
    it('should survive when tiles container is cleared', () => {
      const worldContainer = new Container();
      const tilesContainer = new Container();
      const overlayContainer = new Container();
      worldContainer.addChild(tilesContainer);
      worldContainer.addChild(overlayContainer);

      const tileRenderer = new TileRenderer(tilesContainer, layout);
      new TileHighlight(overlayContainer, layout);

      // Add some tiles
      tileRenderer.addTile(new TilePosition(0, 0), Terrain.Grassland);
      tileRenderer.addTile(new TilePosition(1, 0), Terrain.Plains);

      expect(tilesContainer.children.length).toBe(2);
      expect(overlayContainer.children.length).toBe(1);

      // Clear tiles
      tileRenderer.clear();

      // Tiles should be cleared
      expect(tilesContainer.children.length).toBe(0);
      // Highlight should still be in overlayContainer
      expect(overlayContainer.children.length).toBe(1);
    });

    it('should render above tiles (correct z-order)', () => {
      const worldContainer = new Container();
      const tilesContainer = new Container();
      const overlayContainer = new Container();
      worldContainer.addChild(tilesContainer);
      worldContainer.addChild(overlayContainer);

      // overlayContainer should have higher index than tilesContainer
      expect(worldContainer.getChildIndex(overlayContainer)).toBeGreaterThan(
        worldContainer.getChildIndex(tilesContainer)
      );
    });

    it('should maintain z-order after multiple tile operations', () => {
      const worldContainer = new Container();
      const tilesContainer = new Container();
      const overlayContainer = new Container();
      worldContainer.addChild(tilesContainer);
      worldContainer.addChild(overlayContainer);

      const tileRenderer = new TileRenderer(tilesContainer, layout);
      const highlight = new TileHighlight(overlayContainer, layout);

      // Add tiles, clear, add more tiles
      tileRenderer.addTile(new TilePosition(0, 0), Terrain.Grassland);
      tileRenderer.clear();
      tileRenderer.addTile(new TilePosition(1, 1), Terrain.Ocean);
      tileRenderer.addTile(new TilePosition(2, 2), Terrain.Mountain);

      // Show highlight
      highlight.show(new TilePosition(1, 1));

      // overlayContainer still has higher index
      expect(worldContainer.getChildIndex(overlayContainer)).toBeGreaterThan(
        worldContainer.getChildIndex(tilesContainer)
      );

      // Both containers have correct children
      expect(tilesContainer.children.length).toBe(2);
      expect(overlayContainer.children.length).toBe(1);
    });
  });

  describe('color customization', () => {
    it('should allow setting custom color', () => {
      const highlight = new TileHighlight(container, layout);

      // Should not throw
      expect(() => highlight.setColor(0xff0000)).not.toThrow();
    });
  });
});
