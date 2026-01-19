// OpenCiv - Entry Point
import { Application, Container } from 'pixi.js';
import { HexGridLayout } from './hex/HexGridLayout';
import { TilePosition } from './hex/TilePosition';
import { TileRenderer } from './render/TileRenderer';
import { TileHighlight } from './render/TileHighlight';
import { CameraController } from './render/CameraController';
import { MapConfig } from './map/MapConfig';
import { MapGenerator, GeneratedTile } from './map/MapGenerator';
import { HoverState, HoverSystem, TileInfoPanel, MapControls, SelectionState, SelectionSystem } from './ui';
import { Terrain } from './tile/Terrain';
import { createGameWorld, createUnitEntity, Position, MovementComponent } from './ecs/world';
import { UnitType, UNIT_TYPE_DATA, MovementExecutor } from './unit';
import { UnitRenderer } from './render/UnitRenderer';
import { SelectionHighlight } from './render/SelectionHighlight';
import { Pathfinder } from './pathfinding/Pathfinder';
import { MovementPreview } from './render/MovementPreview';
import { IWorld } from 'bitecs';

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

  // Create layer hierarchy for proper z-ordering:
  // 1. tilesContainer - terrain tiles at bottom
  // 2. unitContainer - units above tiles
  // 3. overlayContainer - highlights/previews on top
  const tilesContainer = new Container();
  const unitContainer = new Container();
  const overlayContainer = new Container();
  worldContainer.addChild(tilesContainer);
  worldContainer.addChild(unitContainer);
  worldContainer.addChild(overlayContainer);

  // Initialize systems
  const layout = new HexGridLayout(32);
  const tileRenderer = new TileRenderer(tilesContainer, layout);
  const camera = new CameraController(worldContainer);

  // Tile storage - will be updated on regeneration
  const tileMap = new Map<string, GeneratedTile>();

  // Initialize ECS world
  let world: IWorld = createGameWorld();

  // Initialize hover detection system
  const hoverState = new HoverState();
  const hoverSystem = new HoverSystem(layout, camera, tileMap, hoverState);
  const tileHighlight = new TileHighlight(overlayContainer, layout);
  const tileInfoPanel = new TileInfoPanel();

  // Initialize unit systems
  const unitRenderer = new UnitRenderer(unitContainer, layout);
  const selectionState = new SelectionState();
  const selectionHighlight = new SelectionHighlight(overlayContainer, layout);
  const pathfinder = new Pathfinder(tileMap);
  const movementPreview = new MovementPreview(overlayContainer, layout, pathfinder);
  const movementExecutor = new MovementExecutor(world, pathfinder, unitRenderer);

  // Store current seed for display
  let currentSeed = 42;

  /**
   * Find a valid spawn position for a unit (passable land tile).
   */
  function findSpawnPosition(): TilePosition | null {
    for (const [, tile] of tileMap) {
      const terrain = tile.terrain;
      if (
        terrain !== Terrain.Ocean &&
        terrain !== Terrain.Coast &&
        terrain !== Terrain.Lake &&
        terrain !== Terrain.Mountain
      ) {
        return tile.position;
      }
    }
    return null;
  }

  /**
   * Spawn a test unit at a valid position.
   */
  function spawnTestUnit(): number | null {
    const spawnPos = findSpawnPosition();
    if (!spawnPos) return null;

    const data = UNIT_TYPE_DATA[UnitType.Warrior];
    const eid = createUnitEntity(world, spawnPos.q, spawnPos.r, UnitType.Warrior, 0, data.movement);
    unitRenderer.createUnitGraphic(eid, spawnPos, UnitType.Warrior, 0);
    return eid;
  }

  /**
   * Generate and render map with a given seed.
   */
  function generateMap(seed: number): void {
    // Clear existing state
    tileRenderer.clear();
    tileMap.clear();
    hoverState.set(null);
    tileHighlight.hide();
    selectionState.deselect();
    selectionHighlight.hide();
    movementPreview.hide();
    unitRenderer.clear();

    // Reset ECS world
    world = createGameWorld();
    movementExecutor.setWorld(world);

    // Generate new map
    const config = MapConfig.duel(seed);
    const generator = new MapGenerator(config);
    const tiles = generator.generate();

    // Render tiles and populate tileMap
    for (const tile of tiles) {
      tileMap.set(tile.position.key(), tile);
      tileRenderer.addTile(tile.position, tile.terrain);
    }

    // Update pathfinder with new tile map
    pathfinder.setTileMap(tileMap);
    movementPreview.setPathfinder(pathfinder);

    // Spawn test unit
    spawnTestUnit();

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

  // Initialize selection system
  const selectionSystem = new SelectionSystem(layout, camera, world, selectionState);
  selectionSystem.attach(app.canvas as HTMLCanvasElement);

  // Subscribe to hover state changes for visual feedback
  hoverState.subscribe((tile) => {
    if (tile) {
      tileHighlight.show(tile.position);
      tileInfoPanel.show(tile);

      // Update path preview if unit is selected
      if (selectionState.hasSelection()) {
        movementPreview.showPathTo(tile.position);
      }
    } else {
      tileHighlight.hide();
      tileInfoPanel.hide();
      movementPreview.hidePath();
    }
  });

  // Subscribe to selection state changes
  selectionState.subscribe((unitEid) => {
    if (unitEid !== null) {
      const q = Position.q[unitEid];
      const r = Position.r[unitEid];
      const mp = MovementComponent.current[unitEid];
      const pos = new TilePosition(q, r);

      selectionHighlight.show(pos);
      movementPreview.showReachableTiles(pos, mp);
    } else {
      selectionHighlight.hide();
      movementPreview.hide();
    }
  });

  // Handle right-click for movement
  (app.canvas as HTMLCanvasElement).addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selectedUnit = selectionState.get();
    if (selectedUnit === null) return;

    const cameraPos = camera.getPosition();
    const zoom = camera.getZoom();
    const worldX = (e.clientX - cameraPos.x) / zoom;
    const worldY = (e.clientY - cameraPos.y) / zoom;
    const hexPos = layout.worldToHex({ x: worldX, y: worldY });

    if (movementExecutor.executeMove(selectedUnit, hexPos)) {
      // Update selection highlight to new position
      selectionHighlight.show(hexPos);

      // Refresh movement preview with remaining movement
      const mp = MovementComponent.current[selectedUnit];
      if (mp > 0) {
        movementPreview.showReachableTiles(hexPos, mp);
      } else {
        movementPreview.hide();
      }
    }
  });

  // Game loop
  app.ticker.add((ticker) => {
    camera.update(ticker.deltaMS / 1000);
  });

  console.log(`OpenCiv initialized successfully!`);
}

main().catch(console.error);
