// OpenCiv - Entry Point
import { Application, Container } from 'pixi.js';
import { HexGridLayout } from './hex/HexGridLayout';
import { TilePosition } from './hex/TilePosition';
import { TileRenderer } from './render/TileRenderer';
import { TileHighlight } from './render/TileHighlight';
import { CameraController } from './render/CameraController';
import { MapConfig } from './map/MapConfig';
import { MapGenerator, GeneratedTile } from './map/MapGenerator';
import { HoverState, HoverSystem } from './ui';

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

  // Initialize systems
  const layout = new HexGridLayout(32);
  const tileRenderer = new TileRenderer(worldContainer, layout);
  const camera = new CameraController(worldContainer);

  // Generate map using MapGenerator
  const config = MapConfig.duel();
  const generator = new MapGenerator(config);
  const tiles = generator.generate();

  // Build tile lookup map and render tiles
  const tileMap = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    tileMap.set(tile.position.key(), tile);
    tileRenderer.addTile(tile.position, tile.terrain);
  }

  // Initialize hover detection system
  const hoverState = new HoverState();
  const hoverSystem = new HoverSystem(layout, camera, tileMap, hoverState);
  const tileHighlight = new TileHighlight(worldContainer, layout);

  // Attach hover detection to canvas
  hoverSystem.attach(app.canvas as HTMLCanvasElement);

  // Subscribe to hover state changes for visual feedback
  hoverState.subscribe((tile) => {
    if (tile) {
      tileHighlight.show(tile.position);
    } else {
      tileHighlight.hide();
    }
  });

  // Center camera on map
  const [width, height] = config.getDimensions();
  const centerPos = layout.hexToWorld(
    new TilePosition(Math.floor(width / 2), Math.floor(height / 2))
  );
  camera.centerOn(centerPos.x, centerPos.y);

  // Game loop
  app.ticker.add((ticker) => {
    camera.update(ticker.deltaMS / 1000);
  });

  console.log(`OpenCiv initialized successfully! Generated ${tiles.length} tiles.`);
}

main().catch(console.error);
