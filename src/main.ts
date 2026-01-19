// OpenCiv - Entry Point
import { Application, Container } from 'pixi.js';
import { HexGridLayout } from './hex/HexGridLayout';
import { TilePosition } from './hex/TilePosition';
import { TileRenderer } from './render/TileRenderer';
import { TileHighlight } from './render/TileHighlight';
import { CameraController } from './render/CameraController';
import { MapConfig } from './map/MapConfig';
import { MapGenerator, GeneratedTile } from './map/MapGenerator';
import { HoverState, HoverSystem, TileInfoPanel, MapControls } from './ui';

console.log('OpenCiv initializing...');

async function main() {
  // Create PixiJS application
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    resizeTo: window,
  });

  const gameContainer = document.getElementById('game-container');
  if (!gameContainer) {
    throw new Error('Game container not found');
  }
  gameContainer.appendChild(app.canvas);

  // Create world container for camera transforms
  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  // Create layer hierarchy for proper z-ordering
  const tilesContainer = new Container();
  const overlayContainer = new Container();
  worldContainer.addChild(tilesContainer);
  worldContainer.addChild(overlayContainer);

  // Initialize systems
  const layout = new HexGridLayout(32);
  const tileRenderer = new TileRenderer(tilesContainer, layout);
  const camera = new CameraController(worldContainer);

  // Tile storage - will be updated on regeneration
  const tileMap = new Map<string, GeneratedTile>();

  // Initialize hover detection system
  const hoverState = new HoverState();
  const hoverSystem = new HoverSystem(layout, camera, tileMap, hoverState);
  const tileHighlight = new TileHighlight(overlayContainer, layout);
  const tileInfoPanel = new TileInfoPanel();

  // Store current seed for display
  let currentSeed = 42;

  /**
   * Generate and render map with a given seed.
   */
  function generateMap(seed: number): void {
    // Clear existing tiles
    tileRenderer.clear();
    tileMap.clear();
    hoverState.set(null);
    tileHighlight.hide();

    // Generate new map
    const config = MapConfig.duel(seed);
    const generator = new MapGenerator(config);
    const tiles = generator.generate();

    // Render tiles and populate tileMap
    for (const tile of tiles) {
      tileMap.set(tile.position.key(), tile);
      tileRenderer.addTile(tile.position, tile.terrain);
    }

    // Center camera on map
    const [width, height] = config.getDimensions();
    const centerPos = layout.hexToWorld(
      new TilePosition(Math.floor(width / 2), Math.floor(height / 2))
    );
    camera.centerOn(centerPos.x, centerPos.y);

    currentSeed = seed;
    console.log(`Map generated with seed: ${seed}, ${tiles.length} tiles`);
  }

  // Generate initial map
  generateMap(currentSeed);

  // Initialize map controls with regeneration callback
  const mapControls = new MapControls((newSeed) => {
    generateMap(newSeed);
  });
  mapControls.setSeed(currentSeed);
  mapControls.attachKeyboardHandler();

  // Attach hover detection to canvas
  hoverSystem.attach(app.canvas as HTMLCanvasElement);

  // Subscribe to hover state changes for visual feedback
  hoverState.subscribe((tile) => {
    if (tile) {
      tileHighlight.show(tile.position);
      tileInfoPanel.show(tile);
    } else {
      tileHighlight.hide();
      tileInfoPanel.hide();
    }
  });

  // Game loop
  app.ticker.add((ticker) => {
    camera.update(ticker.deltaMS / 1000);
  });

  console.log(`OpenCiv initialized successfully!`);
}

main().catch(console.error);
