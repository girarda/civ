import { Graphics, Container } from 'pixi.js';
import { Terrain } from '../tile/Terrain';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';

export const TERRAIN_COLORS: Record<Terrain, number> = {
  [Terrain.Grassland]: 0x33b333,
  [Terrain.GrasslandHill]: 0x268c26,
  [Terrain.Plains]: 0xccb34d,
  [Terrain.PlainsHill]: 0xa68c40,
  [Terrain.Desert]: 0xf2d980,
  [Terrain.DesertHill]: 0xd9c073,
  [Terrain.Tundra]: 0x99a68c,
  [Terrain.TundraHill]: 0x808c73,
  [Terrain.Snow]: 0xf2f2f2,
  [Terrain.SnowHill]: 0xd9d9d9,
  [Terrain.Mountain]: 0x807366,
  [Terrain.Coast]: 0x4d80cc,
  [Terrain.Ocean]: 0x1a4080,
  [Terrain.Lake]: 0x4073b3,
};

export class TileRenderer {
  private container: Container;
  private layout: HexGridLayout;

  constructor(container: Container, layout: HexGridLayout) {
    this.container = container;
    this.layout = layout;
  }

  /** Create a hex graphics object for a tile */
  createTileGraphic(position: TilePosition, terrain: Terrain): Graphics {
    const worldPos = this.layout.hexToWorld(position);
    const corners = this.layout.hexCorners(position);
    const color = TERRAIN_COLORS[terrain];

    const graphics = new Graphics();
    graphics.poly(corners.flatMap((c) => [c.x - worldPos.x, c.y - worldPos.y]));
    graphics.fill({ color });
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
    graphics.position.set(worldPos.x, worldPos.y);

    return graphics;
  }

  /** Add a tile graphic to the container */
  addTile(position: TilePosition, terrain: Terrain): Graphics {
    const graphic = this.createTileGraphic(position, terrain);
    this.container.addChild(graphic);
    return graphic;
  }

  /** Clear all tiles */
  clear(): void {
    this.container.removeChildren();
  }

  /** Get the layout used by this renderer */
  getLayout(): HexGridLayout {
    return this.layout;
  }

  /** Get the container used by this renderer */
  getContainer(): Container {
    return this.container;
  }
}
