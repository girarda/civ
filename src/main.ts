// OpenCiv - Entry Point
import { Application, Container } from 'pixi.js';
import { HexGridLayout } from './hex/HexGridLayout';
import { TilePosition } from './hex/TilePosition';
import { TileRenderer } from './render/TileRenderer';
import { TileHighlight } from './render/TileHighlight';
import { CameraController } from './render/CameraController';
import { MapConfig } from './map/MapConfig';
import { MapGenerator, GeneratedTile } from './map/MapGenerator';
import {
  HoverState,
  HoverSystem,
  TileInfoPanel,
  MapControls,
  SelectionState,
  SelectionSystem,
  TurnControls,
  CityState,
  CityInfoPanel,
  CombatPreviewPanel,
  ProductionUI,
} from './ui';
import { getCityAtPosition } from './ecs/citySystems';
import { getUnitAtPosition, getUnitHealth, getUnitOwner } from './ecs/unitSystems';
import { Terrain } from './tile/Terrain';
import {
  createGameWorld,
  createUnitEntity,
  Position,
  MovementComponent,
  OwnerComponent,
  UnitComponent,
} from './ecs/world';
import { CityComponent } from './ecs/cityComponents';
import { UnitType, UNIT_TYPE_DATA, MovementExecutor, getUnitName } from './unit';
import { UnitRenderer } from './render/UnitRenderer';
import { SelectionHighlight } from './render/SelectionHighlight';
import { Pathfinder } from './pathfinding/Pathfinder';
import { MovementPreview } from './render/MovementPreview';
import { IWorld } from 'bitecs';
import { GameState, TurnSystem } from './game';
import { CityRenderer } from './render/CityRenderer';
import { TerritoryRenderer } from './render/TerritoryRenderer';
import {
  TerritoryManager,
  canFoundCity,
  tryFoundCity,
  getCityNameByIndex,
  CityProcessor,
} from './city';
import {
  CombatExecutor,
  CombatPreviewState,
  calculateCombat,
  getTotalDefenseModifier,
  getDefenseModifierNames,
} from './combat';
import { PlayerManager } from './player';

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
  // 2. territoryContainer - territory overlays
  // 3. cityContainer - cities above territory
  // 4. unitContainer - units above cities
  // 5. overlayContainer - highlights/previews on top
  const tilesContainer = new Container();
  const territoryContainer = new Container();
  const cityContainer = new Container();
  const unitContainer = new Container();
  const overlayContainer = new Container();
  worldContainer.addChild(tilesContainer);
  worldContainer.addChild(territoryContainer);
  worldContainer.addChild(cityContainer);
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

  // Initialize city systems
  const cityRenderer = new CityRenderer(cityContainer, layout);
  const territoryRenderer = new TerritoryRenderer(territoryContainer, layout);
  let territoryManager = new TerritoryManager();

  // Initialize city UI
  const cityState = new CityState();
  const cityInfoPanel = new CityInfoPanel();
  const productionUI = new ProductionUI({
    onProductionSelected: (cityEid, buildableType) => {
      cityProcessor.setProduction(cityEid, buildableType);
      cityInfoPanel.refresh();
    },
  });

  // Initialize game state and combat systems
  const gameState = new GameState();
  const combatPreviewState = new CombatPreviewState();
  const combatPreviewPanel = new CombatPreviewPanel();

  // Initialize player manager
  const playerManager = new PlayerManager();
  playerManager.initialize([0], 2); // Player 0 is human, 2 total players

  // Subscribe to elimination events for logging
  playerManager.subscribe((event) => {
    if (event.type === 'eliminated') {
      const player = playerManager.getPlayer(event.playerId);
      console.log(`${player?.name ?? 'Unknown player'} has been eliminated!`);
    }
  });

  // CombatExecutor will be updated when world resets
  const combatExecutor = new CombatExecutor(
    world,
    tileMap,
    unitRenderer,
    selectionState,
    gameState,
    playerManager
  );

  // Initialize city processor for turn integration
  const cityProcessor = new CityProcessor(world, territoryManager, tileMap, {
    onProductionCompleted: (event) => {
      // Render the newly spawned unit
      unitRenderer.createUnitGraphic(event.unitEid, event.position, event.unitType, event.playerId);
      console.log(`Production completed in city ${event.cityEid}: unit ${event.unitEid} spawned`);
    },
    onPopulationGrowth: (event) => {
      console.log(`City ${event.cityEid} grew to population ${event.newPopulation}`);
    },
  });

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
   * Spawn a test Settler at a valid position.
   */
  function spawnTestSettler(): number | null {
    const spawnPos = findSpawnPosition();
    if (!spawnPos) return null;

    const data = UNIT_TYPE_DATA[UnitType.Settler];
    const eid = createUnitEntity(world, spawnPos.q, spawnPos.r, UnitType.Settler, 0, data.movement);
    unitRenderer.createUnitGraphic(eid, spawnPos, UnitType.Settler, 0);
    return eid;
  }

  /**
   * Spawn test units - warriors for combat testing.
   */
  function spawnTestWarriors(): void {
    const spawnPos = findSpawnPosition();
    if (!spawnPos) return;

    // Spawn player 0 warrior
    const data = UNIT_TYPE_DATA[UnitType.Warrior];
    const eid1 = createUnitEntity(
      world,
      spawnPos.q,
      spawnPos.r,
      UnitType.Warrior,
      0,
      data.movement
    );
    unitRenderer.createUnitGraphic(eid1, spawnPos, UnitType.Warrior, 0);

    // Spawn player 1 warrior adjacent to player 0's warrior for combat testing
    const neighbors = spawnPos.neighbors();
    for (const neighborPos of neighbors) {
      const tile = tileMap.get(neighborPos.key());
      if (
        tile &&
        tile.terrain !== Terrain.Ocean &&
        tile.terrain !== Terrain.Coast &&
        tile.terrain !== Terrain.Lake &&
        tile.terrain !== Terrain.Mountain
      ) {
        const eid2 = createUnitEntity(
          world,
          neighborPos.q,
          neighborPos.r,
          UnitType.Warrior,
          1,
          data.movement
        );
        unitRenderer.createUnitGraphic(eid2, neighborPos, UnitType.Warrior, 1);
        break;
      }
    }
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
    cityRenderer.clear();
    territoryRenderer.clear();
    territoryManager.clear();
    cityState.deselect();
    cityInfoPanel.hide();

    // Reset ECS world
    world = createGameWorld();
    movementExecutor.setWorld(world);

    // Reset territory manager and city processor references
    territoryManager = new TerritoryManager();
    cityProcessor.setWorld(world);
    cityProcessor.setTerritoryManager(territoryManager);
    cityProcessor.setTileMap(tileMap);

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

    // Spawn test units
    spawnTestSettler();
    spawnTestWarriors();

    // Update combat executor with new world and tile map
    combatExecutor.setWorld(world);
    combatExecutor.setTileMap(tileMap);
    combatExecutor.setUnitRenderer(unitRenderer);
    combatExecutor.setPlayerManager(playerManager);

    // Reset player manager
    playerManager.clear();
    playerManager.initialize([0], 2);

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

  // Initialize turn system (gameState already created above)
  const turnSystem = new TurnSystem(gameState, {
    onTurnStart: () => {
      console.log(`Turn ${gameState.getTurnNumber()} started`);
      movementExecutor.resetAllMovementPoints();

      // Refresh movement preview for selected unit
      const selectedUnit = selectionState.get();
      if (selectedUnit !== null) {
        const q = Position.q[selectedUnit];
        const r = Position.r[selectedUnit];
        const mp = MovementComponent.current[selectedUnit];
        const pos = new TilePosition(q, r);
        movementPreview.showReachableTiles(pos, mp);
      }
    },
    onTurnEnd: () => {
      // Process city production and growth
      cityProcessor.processTurnEnd();
      console.log(`Turn ${gameState.getTurnNumber()} ending`);
    },
  });
  turnSystem.attach();

  // Initialize turn controls
  const turnControls = new TurnControls();
  turnControls.updateTurnDisplay(gameState.getTurnNumber());
  turnControls.onEndTurn(() => {
    gameState.nextTurn();
  });
  turnControls.attachKeyboardHandler();

  // Subscribe to game state changes for UI updates
  gameState.subscribe((state) => {
    turnControls.updateTurnDisplay(state.turnNumber);
  });

  // Attach hover detection to canvas
  hoverSystem.attach(app.canvas as HTMLCanvasElement);

  // Initialize selection system
  const selectionSystem = new SelectionSystem(layout, camera, world, selectionState);
  selectionSystem.attach(app.canvas as HTMLCanvasElement);

  // Subscribe to combat preview state for UI updates
  combatPreviewState.subscribe((data) => {
    if (data) {
      combatPreviewPanel.show(data);
    } else {
      combatPreviewPanel.hide();
    }
  });

  /**
   * Update combat preview when hovering over a tile.
   */
  function updateCombatPreview(tile: GeneratedTile | null): void {
    const selectedUnit = selectionState.get();
    if (selectedUnit === null || tile === null) {
      combatPreviewState.hide();
      return;
    }

    // Check if there's an enemy at the hovered position
    const defenderEid = getUnitAtPosition(world, tile.position.q, tile.position.r);
    if (defenderEid === null) {
      combatPreviewState.hide();
      return;
    }

    // Check if it's an enemy (different owner)
    const attackerOwner = getUnitOwner(selectedUnit);
    const defenderOwner = getUnitOwner(defenderEid);
    if (attackerOwner === defenderOwner) {
      combatPreviewState.hide();
      return;
    }

    // Check if the target is adjacent (melee range)
    const attackerPos = new TilePosition(Position.q[selectedUnit], Position.r[selectedUnit]);
    if (attackerPos.distanceTo(tile.position) !== 1) {
      combatPreviewState.hide();
      return;
    }

    // Calculate combat preview
    const attackerType = UnitComponent.type[selectedUnit] as UnitType;
    const defenderType = UnitComponent.type[defenderEid] as UnitType;
    const attackerData = UNIT_TYPE_DATA[attackerType];
    const defenderData = UNIT_TYPE_DATA[defenderType];
    const attackerHealth = getUnitHealth(selectedUnit);
    const defenderHealth = getUnitHealth(defenderEid);
    const defenseModifier = getTotalDefenseModifier(tile);

    const result = calculateCombat({
      attackerStrength: attackerData.strength,
      defenderStrength: defenderData.strength,
      attackerHealth: attackerHealth.current,
      defenderHealth: defenderHealth.current,
      defenseModifier,
    });

    combatPreviewState.show({
      attackerName: getUnitName(attackerType),
      defenderName: getUnitName(defenderType),
      attackerCurrentHealth: attackerHealth.current,
      attackerMaxHealth: attackerHealth.max,
      attackerExpectedHealth: attackerHealth.current - result.attackerDamage,
      defenderCurrentHealth: defenderHealth.current,
      defenderMaxHealth: defenderHealth.max,
      defenderExpectedHealth: defenderHealth.current - result.defenderDamage,
      defenderModifiers: getDefenseModifierNames(tile),
    });
  }

  // Subscribe to hover state changes for visual feedback
  hoverState.subscribe((tile) => {
    if (tile) {
      tileHighlight.show(tile.position);
      tileInfoPanel.show(tile);

      // Update path preview if unit is selected
      if (selectionState.hasSelection()) {
        movementPreview.showPathTo(tile.position);
      }

      // Update combat preview
      const tileData = tileMap.get(tile.position.key());
      updateCombatPreview(tileData || null);
    } else {
      tileHighlight.hide();
      tileInfoPanel.hide();
      movementPreview.hidePath();
      combatPreviewState.hide();
    }
  });

  // Subscribe to unit selection state changes
  selectionState.subscribe((unitEid) => {
    if (unitEid !== null) {
      const q = Position.q[unitEid];
      const r = Position.r[unitEid];
      const mp = MovementComponent.current[unitEid];
      const pos = new TilePosition(q, r);

      selectionHighlight.show(pos);
      movementPreview.showReachableTiles(pos, mp);

      // Deselect city when unit is selected
      cityState.deselect();
      cityInfoPanel.hide();
    } else {
      selectionHighlight.hide();
      movementPreview.hide();
    }
  });

  // Subscribe to city selection state changes
  cityState.subscribe((cityEid) => {
    if (cityEid !== null) {
      cityInfoPanel.show(cityEid, world, territoryManager, tileMap);
      productionUI.setCityEid(cityEid);
    } else {
      cityInfoPanel.hide();
      productionUI.setCityEid(null);
    }
  });

  // Handle city selection on click (when no unit at position)
  (app.canvas as HTMLCanvasElement).addEventListener('click', (e) => {
    const cameraPos = camera.getPosition();
    const zoom = camera.getZoom();
    const worldX = (e.clientX - cameraPos.x) / zoom;
    const worldY = (e.clientY - cameraPos.y) / zoom;
    const hexPos = layout.worldToHex({ x: worldX, y: worldY });

    // Check if a unit was selected (handled by SelectionSystem)
    const unitAtPos = getUnitAtPosition(world, hexPos.q, hexPos.r);
    if (unitAtPos !== null) {
      // Unit selected - SelectionSystem handles this
      return;
    }

    // No unit - check for city
    const cityAtPos = getCityAtPosition(world, hexPos.q, hexPos.r);
    if (cityAtPos !== null) {
      // Deselect unit and select city
      selectionState.deselect();
      cityState.select(cityAtPos);
    } else {
      // Nothing at position - deselect both
      cityState.deselect();
    }
  });

  // Handle right-click for movement or attack
  (app.canvas as HTMLCanvasElement).addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const selectedUnit = selectionState.get();
    if (selectedUnit === null) return;

    const cameraPos = camera.getPosition();
    const zoom = camera.getZoom();
    const worldX = (e.clientX - cameraPos.x) / zoom;
    const worldY = (e.clientY - cameraPos.y) / zoom;
    const hexPos = layout.worldToHex({ x: worldX, y: worldY });

    // Check if there's an enemy at target - if so, try to attack
    if (combatExecutor.hasEnemyAt(selectedUnit, hexPos)) {
      const result = combatExecutor.executeAttack(selectedUnit, hexPos);
      if (result) {
        console.log(
          `Combat: Attacker took ${result.attackerDamage} damage, Defender took ${result.defenderDamage} damage`
        );

        // Hide combat preview after attack
        combatPreviewState.hide();

        // If attacker survived, update highlights
        if (result.attackerSurvives) {
          const attackerPos = new TilePosition(Position.q[selectedUnit], Position.r[selectedUnit]);
          selectionHighlight.show(attackerPos);

          // Refresh movement preview (will be empty since attacking consumes all MP)
          const mp = MovementComponent.current[selectedUnit];
          if (mp > 0) {
            movementPreview.showReachableTiles(attackerPos, mp);
          } else {
            movementPreview.hide();
          }
        }
        return;
      }
    }

    // Otherwise try to move
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

  // Handle B key for founding cities
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b') {
      const selectedUnit = selectionState.get();
      if (selectedUnit === null) return;

      // Check if selected unit is a Settler
      const unitType = UnitComponent.type[selectedUnit];
      if (unitType !== UnitType.Settler) {
        console.log('Only Settlers can found cities');
        return;
      }

      // Check if city can be founded
      if (!canFoundCity(world, selectedUnit, tileMap)) {
        console.log('Cannot found city here');
        return;
      }

      // Attempt to found city
      const result = tryFoundCity(
        world,
        selectedUnit,
        tileMap,
        territoryManager,
        (cityEid, position) => {
          // Get city name and player
          const playerId = OwnerComponent.playerId[cityEid];
          const nameIndex = CityComponent.nameIndex[cityEid];
          const name = getCityNameByIndex(nameIndex);

          // Render city and territory
          cityRenderer.createCityGraphic(cityEid, position, name, playerId);
          territoryRenderer.updateTerritoryBorders(
            cityEid,
            territoryManager.getTilesForCity(cityEid),
            playerId
          );

          console.log(`Founded city: ${name}`);
        }
      );

      if (result.success) {
        // Remove settler from renderer
        unitRenderer.removeUnit(selectedUnit);

        // Deselect since settler is gone
        selectionState.deselect();
      } else if (result.error) {
        console.log(`Failed to found city: ${result.error}`);
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
