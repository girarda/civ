# Plan: Unit Spawning + Movement (Phase 3)

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement unit data models, rendering, selection, pathfinding, and movement using bitECS. Units will be managed as ECS entities with Position, UnitType, and Movement components. This phase focuses on local single-player functionality; networking will be integrated in a subsequent phase.

## Research Summary

Key findings from codebase analysis:

- **ECS Foundation**: bitECS is already configured with `createWorld()`, component definitions (`Position`, `TerrainComponent`, etc.), and query systems in `src/ecs/`
- **Rendering Pattern**: `TileRenderer` creates PixiJS Graphics objects positioned via `HexGridLayout.hexToWorld()`
- **Input Handling**: `HoverSystem` converts screen coordinates to hex via `CameraController` and `HexGridLayout.worldToHex()`
- **Coordinate System**: `TilePosition` provides hex math including `neighbors()`, `distanceTo()`, and `key()` for Map storage
- **Movement Costs**: `TERRAIN_DATA` in `Terrain.ts` already defines `movementCost` and `isPassable` per terrain type
- **State Pattern**: `HoverState` demonstrates reactive state with pub/sub for UI updates

## Phased Implementation

### Phase 1: Unit Data Model + ECS Components

**Goal**: Define unit types, ECS components, and entity creation helpers.

#### Tasks

- [ ] Create `src/unit/UnitType.ts` - Enum and static data for unit types
- [ ] Create `src/unit/UnitData.ts` - Per-unit-type stats (movement, strength, etc.)
- [ ] Add `UnitComponent` to `src/ecs/world.ts` - Unit type identifier
- [ ] Add `MovementComponent` to `src/ecs/world.ts` - Movement points (current/max)
- [ ] Add `OwnerComponent` to `src/ecs/world.ts` - Player ownership
- [ ] Create `createUnitEntity()` helper function in `src/ecs/world.ts`
- [ ] Create `src/ecs/unitSystems.ts` - Unit queries (all units, units at position)
- [ ] Add `src/unit/index.ts` - Module exports
- [ ] Write unit tests for component creation

#### Implementation Details

**UnitType.ts**

```typescript
export enum UnitType {
  Warrior = 'Warrior',
  Scout = 'Scout',
  Settler = 'Settler',
}

export interface UnitTypeData {
  name: string;
  movement: number;
  strength: number;
  rangedStrength: number;
  range: number;
  cost: number;
}

export const UNIT_TYPE_DATA: Record<UnitType, UnitTypeData> = {
  [UnitType.Warrior]: {
    name: 'Warrior',
    movement: 2,
    strength: 8,
    rangedStrength: 0,
    range: 0,
    cost: 40,
  },
  [UnitType.Scout]: {
    name: 'Scout',
    movement: 3,
    strength: 5,
    rangedStrength: 0,
    range: 0,
    cost: 25,
  },
  [UnitType.Settler]: {
    name: 'Settler',
    movement: 2,
    strength: 0,
    rangedStrength: 0,
    range: 0,
    cost: 80,
  },
};
```

**ECS Components (world.ts additions)**

```typescript
export const UnitComponent = defineComponent({
  type: Types.ui8, // UnitType enum value
});

export const MovementComponent = defineComponent({
  current: Types.ui8, // Remaining movement points this turn
  max: Types.ui8, // Maximum movement points
});

export const OwnerComponent = defineComponent({
  playerId: Types.ui8,
});

export function createUnitEntity(
  world: IWorld,
  q: number,
  r: number,
  unitType: number,
  playerId: number,
  maxMovement: number
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, UnitComponent, eid);
  addComponent(world, MovementComponent, eid);
  addComponent(world, OwnerComponent, eid);

  Position.q[eid] = q;
  Position.r[eid] = r;
  UnitComponent.type[eid] = unitType;
  MovementComponent.current[eid] = maxMovement;
  MovementComponent.max[eid] = maxMovement;
  OwnerComponent.playerId[eid] = playerId;

  return eid;
}
```

#### Success Criteria

- [ ] UnitType enum with at least 3 unit types (Warrior, Scout, Settler)
- [ ] Components store type, position, movement points, owner
- [ ] `createUnitEntity()` returns valid entity ID
- [ ] Unit can be queried by position
- [ ] Unit tests verify component data integrity

---

### Phase 2: Unit Rendering

**Goal**: Render units as colored circles with letter indicators on their tile.

#### Tasks

- [ ] Create `src/render/UnitRenderer.ts` - Renders unit sprites
- [ ] Define unit colors per player ID
- [ ] Create unit graphic (circle with letter abbreviation)
- [ ] Position unit graphic at hex center (offset from tile)
- [ ] Add `unitContainer` to world container in `main.ts` (renders above tiles)
- [ ] Create `UnitRenderSystem` to sync ECS entities with graphics
- [ ] Add unit graphics Map for entity ID to Graphics lookup
- [ ] Handle unit creation/destruction graphics lifecycle
- [ ] Write tests for render positioning

#### Implementation Details

**UnitRenderer.ts**

```typescript
import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { UnitType } from '../unit/UnitType';

const PLAYER_COLORS: number[] = [
  0x3498db, // Blue
  0xe74c3c, // Red
  0x2ecc71, // Green
  0xf39c12, // Orange
];

const UNIT_RADIUS = 12;

export class UnitRenderer {
  private container: Container;
  private layout: HexGridLayout;
  private graphics: Map<number, Graphics> = new Map(); // eid -> Graphics

  constructor(container: Container, layout: HexGridLayout) {
    this.container = container;
    this.layout = layout;
  }

  createUnitGraphic(
    eid: number,
    position: TilePosition,
    unitType: UnitType,
    playerId: number
  ): Graphics {
    const worldPos = this.layout.hexToWorld(position);
    const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

    const graphic = new Graphics();
    graphic.circle(0, 0, UNIT_RADIUS);
    graphic.fill({ color });
    graphic.stroke({ width: 2, color: 0x000000, alpha: 0.5 });
    graphic.position.set(worldPos.x, worldPos.y);

    // Add letter abbreviation
    const letter = unitType.charAt(0);
    const style = new TextStyle({
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    const text = new Text({ text: letter, style });
    text.anchor.set(0.5);
    graphic.addChild(text);

    this.graphics.set(eid, graphic);
    this.container.addChild(graphic);
    return graphic;
  }

  updatePosition(eid: number, position: TilePosition): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      const worldPos = this.layout.hexToWorld(position);
      graphic.position.set(worldPos.x, worldPos.y);
    }
  }

  removeUnit(eid: number): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      this.container.removeChild(graphic);
      graphic.destroy();
      this.graphics.delete(eid);
    }
  }

  clear(): void {
    for (const [eid] of this.graphics) {
      this.removeUnit(eid);
    }
  }

  getGraphic(eid: number): Graphics | undefined {
    return this.graphics.get(eid);
  }
}
```

#### Success Criteria

- [ ] Units render as colored circles at hex centers
- [ ] Letter indicates unit type (W for Warrior, S for Scout/Settler)
- [ ] Player color differentiates ownership
- [ ] Unit graphics layer renders above terrain
- [ ] Graphics update when unit position changes
- [ ] Graphics are removed when unit is destroyed

---

### Phase 3: Selection System

**Goal**: Click to select units; show selection indicator; track selected unit state.

#### Tasks

- [ ] Create `src/ui/SelectionState.ts` - Reactive state for selected unit
- [ ] Create `src/ui/SelectionSystem.ts` - Click detection and unit selection
- [ ] Create `src/render/SelectionHighlight.ts` - Visual selection indicator
- [ ] Add click event handler to canvas (in addition to existing hover)
- [ ] Query units at clicked position using ECS
- [ ] Update selection state on click
- [ ] Show selection highlight around selected unit
- [ ] Deselect when clicking empty tile or pressing Escape
- [ ] Write tests for selection logic

#### Implementation Details

**SelectionState.ts**

```typescript
type SelectionListener = (unitEid: number | null) => void;

export class SelectionState {
  private selectedUnit: number | null = null;
  private listeners: SelectionListener[] = [];

  get(): number | null {
    return this.selectedUnit;
  }

  select(unitEid: number | null): void {
    if (this.selectedUnit === unitEid) return;
    this.selectedUnit = unitEid;
    for (const listener of this.listeners) {
      listener(unitEid);
    }
  }

  deselect(): void {
    this.select(null);
  }

  subscribe(listener: SelectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  clear(): void {
    this.listeners = [];
    this.selectedUnit = null;
  }
}
```

**SelectionSystem.ts**

```typescript
import { IWorld } from 'bitecs';
import { HexGridLayout } from '../hex/HexGridLayout';
import { CameraController } from '../render/CameraController';
import { SelectionState } from './SelectionState';
import { getUnitAtPosition } from '../ecs/unitSystems';

export class SelectionSystem {
  private layout: HexGridLayout;
  private camera: CameraController;
  private world: IWorld;
  private selectionState: SelectionState;
  private canvas: HTMLCanvasElement | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    layout: HexGridLayout,
    camera: CameraController,
    world: IWorld,
    selectionState: SelectionState
  ) {
    this.layout = layout;
    this.camera = camera;
    this.world = world;
    this.selectionState = selectionState;
  }

  private screenToWorld(screenX: number, screenY: number) {
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    return {
      x: (screenX - cameraPos.x) / zoom,
      y: (screenY - cameraPos.y) / zoom,
    };
  }

  handleClick(event: MouseEvent): void {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    const hexPos = this.layout.worldToHex(worldPos);
    const unitEid = getUnitAtPosition(this.world, hexPos.q, hexPos.r);
    this.selectionState.select(unitEid);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.selectionState.deselect();
    };
    canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    if (this.canvas && this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
  }
}
```

#### Success Criteria

- [ ] Clicking on a unit selects it
- [ ] Selected unit has visible highlight (ring or glow)
- [ ] Clicking empty tile deselects
- [ ] Pressing Escape deselects
- [ ] Only one unit can be selected at a time
- [ ] Selection state is reactive (triggers UI updates)

---

### Phase 4: A* Pathfinding

**Goal**: Implement A* pathfinding with terrain movement costs.

#### Tasks

- [ ] Create `src/pathfinding/Pathfinder.ts` - A* implementation
- [ ] Create `src/pathfinding/MovementCost.ts` - Cost calculation per tile
- [ ] Integrate terrain `movementCost` and `isPassable` from `Terrain.ts`
- [ ] Add feature movement cost modifiers (Forest: +1, Jungle: +1, etc.)
- [ ] Support movement point constraints (path segments within budget)
- [ ] Return path as array of `TilePosition` with cumulative costs
- [ ] Handle impassable terrain (Mountains, Water for land units)
- [ ] Add `src/pathfinding/index.ts` - Module exports
- [ ] Write comprehensive unit tests for pathfinding

#### Implementation Details

**Pathfinder.ts**

```typescript
import { TilePosition } from '../hex/TilePosition';
import { Terrain, TERRAIN_DATA } from '../tile/Terrain';
import { TileFeature, FEATURE_DATA } from '../tile/TileFeature';
import { GeneratedTile } from '../map/MapGenerator';

export interface PathNode {
  position: TilePosition;
  cumulativeCost: number;
}

export interface PathResult {
  path: PathNode[];
  totalCost: number;
  reachable: boolean;
}

export class Pathfinder {
  private tileMap: Map<string, GeneratedTile>;

  constructor(tileMap: Map<string, GeneratedTile>) {
    this.tileMap = tileMap;
  }

  getMovementCost(position: TilePosition): number {
    const tile = this.tileMap.get(position.key());
    if (!tile) return Infinity;

    const terrainData = TERRAIN_DATA[tile.terrain];
    if (!terrainData.isPassable) return Infinity;

    let cost = terrainData.movementCost;

    // Feature modifiers
    if (tile.feature) {
      const featureData = FEATURE_DATA[tile.feature];
      cost += featureData?.movementCost ?? 0;
    }

    return cost;
  }

  findPath(
    start: TilePosition,
    end: TilePosition,
    maxMovement: number = Infinity
  ): PathResult {
    if (start.equals(end)) {
      return { path: [{ position: start, cumulativeCost: 0 }], totalCost: 0, reachable: true };
    }

    const openSet = new Map<string, { pos: TilePosition; g: number; f: number; parent: string | null }>();
    const closedSet = new Set<string>();

    const startKey = start.key();
    openSet.set(startKey, {
      pos: start,
      g: 0,
      f: start.distanceTo(end),
      parent: null,
    });

    while (openSet.size > 0) {
      // Find node with lowest f score
      let currentKey = '';
      let lowestF = Infinity;
      for (const [key, node] of openSet) {
        if (node.f < lowestF) {
          lowestF = node.f;
          currentKey = key;
        }
      }

      const current = openSet.get(currentKey)!;
      openSet.delete(currentKey);
      closedSet.add(currentKey);

      if (current.pos.equals(end)) {
        return this.reconstructPath(current, closedSet, start);
      }

      for (const neighbor of current.pos.neighbors()) {
        const neighborKey = neighbor.key();
        if (closedSet.has(neighborKey)) continue;

        const moveCost = this.getMovementCost(neighbor);
        if (moveCost === Infinity) continue;

        const tentativeG = current.g + moveCost;
        if (tentativeG > maxMovement) continue;

        const existing = openSet.get(neighborKey);
        if (!existing || tentativeG < existing.g) {
          openSet.set(neighborKey, {
            pos: neighbor,
            g: tentativeG,
            f: tentativeG + neighbor.distanceTo(end),
            parent: currentKey,
          });
        }
      }
    }

    return { path: [], totalCost: Infinity, reachable: false };
  }

  private reconstructPath(
    endNode: { pos: TilePosition; g: number; parent: string | null },
    visited: Set<string>,
    start: TilePosition
  ): PathResult {
    // Implementation details for path reconstruction
    // Returns PathNode[] with cumulative costs
    const path: PathNode[] = [];
    // ... reconstruction logic
    return { path, totalCost: endNode.g, reachable: true };
  }

  /**
   * Get all tiles reachable within movement budget.
   */
  getReachableTiles(start: TilePosition, movement: number): Map<string, number> {
    const reachable = new Map<string, number>();
    const queue: { pos: TilePosition; cost: number }[] = [{ pos: start, cost: 0 }];

    reachable.set(start.key(), 0);

    while (queue.length > 0) {
      const { pos, cost } = queue.shift()!;

      for (const neighbor of pos.neighbors()) {
        const key = neighbor.key();
        if (reachable.has(key)) continue;

        const moveCost = this.getMovementCost(neighbor);
        const totalCost = cost + moveCost;

        if (totalCost <= movement) {
          reachable.set(key, totalCost);
          queue.push({ pos: neighbor, cost: totalCost });
        }
      }
    }

    return reachable;
  }
}
```

#### Success Criteria

- [ ] A* finds shortest path between two land tiles
- [ ] Path respects terrain movement costs (hills cost 2)
- [ ] Path avoids impassable terrain (mountains, water)
- [ ] Feature costs are added (forest/jungle add +1)
- [ ] `getReachableTiles()` returns all tiles within movement budget
- [ ] Pathfinding is deterministic
- [ ] Performance is acceptable for map sizes up to 100x100

---

### Phase 5: Movement Preview

**Goal**: Show path and reachable tiles when a unit is selected.

#### Tasks

- [ ] Create `src/render/MovementPreview.ts` - Visualizes movement range and path
- [ ] Highlight all reachable tiles with semi-transparent overlay
- [ ] Draw path line from unit to hovered tile
- [ ] Show movement cost at each path node (optional)
- [ ] Color-code tiles by movement cost (green = cheap, yellow = expensive)
- [ ] Update preview when hovered tile changes
- [ ] Clear preview when unit deselected
- [ ] Integrate with HoverState for path updates
- [ ] Write visual regression tests (E2E)

#### Implementation Details

**MovementPreview.ts**

```typescript
import { Graphics, Container } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { Pathfinder, PathNode } from '../pathfinding/Pathfinder';

const REACHABLE_COLOR = 0x00ff00;
const REACHABLE_ALPHA = 0.2;
const PATH_COLOR = 0xffffff;
const PATH_WIDTH = 3;

export class MovementPreview {
  private container: Container;
  private layout: HexGridLayout;
  private pathfinder: Pathfinder;
  private reachableGraphics: Graphics;
  private pathGraphics: Graphics;

  constructor(container: Container, layout: HexGridLayout, pathfinder: Pathfinder) {
    this.container = container;
    this.layout = layout;
    this.pathfinder = pathfinder;

    this.reachableGraphics = new Graphics();
    this.pathGraphics = new Graphics();
    container.addChild(this.reachableGraphics);
    container.addChild(this.pathGraphics);
  }

  showReachableTiles(start: TilePosition, movement: number): void {
    this.reachableGraphics.clear();
    const reachable = this.pathfinder.getReachableTiles(start, movement);

    for (const [key] of reachable) {
      const [q, r] = key.split(',').map(Number);
      const pos = new TilePosition(q, r);
      this.drawReachableHex(pos);
    }
  }

  private drawReachableHex(position: TilePosition): void {
    const worldPos = this.layout.hexToWorld(position);
    const corners = this.layout.hexCorners(position);
    const localCorners = corners.flatMap((c) => [c.x - worldPos.x, c.y - worldPos.y]);

    this.reachableGraphics.poly(localCorners);
    this.reachableGraphics.fill({ color: REACHABLE_COLOR, alpha: REACHABLE_ALPHA });
  }

  showPath(path: PathNode[]): void {
    this.pathGraphics.clear();
    if (path.length < 2) return;

    const points: number[] = [];
    for (const node of path) {
      const worldPos = this.layout.hexToWorld(node.position);
      points.push(worldPos.x, worldPos.y);
    }

    this.pathGraphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.pathGraphics.lineTo(points[i], points[i + 1]);
    }
    this.pathGraphics.stroke({ width: PATH_WIDTH, color: PATH_COLOR });
  }

  hide(): void {
    this.reachableGraphics.clear();
    this.pathGraphics.clear();
  }
}
```

#### Success Criteria

- [ ] Selecting a unit shows all reachable tiles highlighted
- [ ] Hovering over a reachable tile shows path line
- [ ] Path line connects unit to hover target
- [ ] Unreachable tiles (outside movement range) are not highlighted
- [ ] Preview clears when unit is deselected
- [ ] Preview updates in real-time as mouse moves

---

### Phase 6: Movement Execution

**Goal**: Execute unit movement along computed path.

#### Tasks

- [ ] Create `src/unit/MovementSystem.ts` - Handles movement commands
- [ ] Add right-click to move selected unit to target
- [ ] Validate movement (unit selected, target reachable, sufficient MP)
- [ ] Update unit Position component in ECS
- [ ] Subtract movement cost from MovementComponent.current
- [ ] Animate unit movement along path (optional: tween)
- [ ] Update UnitRenderer position
- [ ] Clear selection after move (or keep selected, configurable)
- [ ] Add turn end to reset movement points
- [ ] Write unit tests for movement validation
- [ ] Write E2E tests for movement flow

#### Implementation Details

**MovementSystem.ts**

```typescript
import { IWorld } from 'bitecs';
import { Position, MovementComponent } from '../ecs/world';
import { TilePosition } from '../hex/TilePosition';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { UnitRenderer } from '../render/UnitRenderer';

export class MovementExecutor {
  private world: IWorld;
  private pathfinder: Pathfinder;
  private unitRenderer: UnitRenderer;

  constructor(world: IWorld, pathfinder: Pathfinder, unitRenderer: UnitRenderer) {
    this.world = world;
    this.pathfinder = pathfinder;
    this.unitRenderer = unitRenderer;
  }

  canMove(unitEid: number, target: TilePosition): boolean {
    const currentQ = Position.q[unitEid];
    const currentR = Position.r[unitEid];
    const currentPos = new TilePosition(currentQ, currentR);
    const currentMP = MovementComponent.current[unitEid];

    const result = this.pathfinder.findPath(currentPos, target, currentMP);
    return result.reachable;
  }

  executeMove(unitEid: number, target: TilePosition): boolean {
    if (!this.canMove(unitEid, target)) return false;

    const currentQ = Position.q[unitEid];
    const currentR = Position.r[unitEid];
    const currentPos = new TilePosition(currentQ, currentR);
    const currentMP = MovementComponent.current[unitEid];

    const result = this.pathfinder.findPath(currentPos, target, currentMP);

    // Update ECS
    Position.q[unitEid] = target.q;
    Position.r[unitEid] = target.r;
    MovementComponent.current[unitEid] = currentMP - result.totalCost;

    // Update renderer
    this.unitRenderer.updatePosition(unitEid, target);

    return true;
  }

  resetMovementPoints(unitEid: number): void {
    MovementComponent.current[unitEid] = MovementComponent.max[unitEid];
  }
}
```

**Right-click handler integration**

```typescript
// In SelectionSystem or separate MovementInputSystem
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const selectedUnit = selectionState.get();
  if (selectedUnit === null) return;

  const worldPos = screenToWorld(e.clientX, e.clientY);
  const hexPos = layout.worldToHex(worldPos);

  if (movementExecutor.executeMove(selectedUnit, hexPos)) {
    movementPreview.hide();
    // Optionally deselect or keep selected
  }
});
```

#### Success Criteria

- [ ] Right-clicking valid tile moves selected unit
- [ ] Unit position updates in ECS and visually
- [ ] Movement points are deducted correctly
- [ ] Cannot move to unreachable tiles
- [ ] Cannot move without sufficient movement points
- [ ] Movement preview clears after move
- [ ] Turn end resets movement points to max

---

### Phase 7: Integration + Polish

**Goal**: Wire everything together in main.ts; add unit spawning UI.

#### Tasks

- [ ] Create unit container layer in main.ts (above tiles, below UI)
- [ ] Initialize all unit systems (renderer, selection, pathfinding, movement)
- [ ] Add temporary unit spawn on map generation (for testing)
- [ ] Add Unit Info Panel (similar to Tile Info Panel)
- [ ] Show selected unit stats (type, movement remaining, strength)
- [ ] Add keyboard shortcuts (M for move mode, if needed)
- [ ] Update index.html with unit panel elements
- [ ] Update style.css with unit panel styles
- [ ] Update ui/index.ts exports
- [ ] Update CLAUDE.md with new modules
- [ ] Run full test suite and fix any failures

#### Implementation Details

**main.ts additions**

```typescript
import { createGameWorld, createUnitEntity, UnitComponent, MovementComponent } from './ecs/world';
import { UnitRenderer } from './render/UnitRenderer';
import { SelectionState, SelectionSystem } from './ui';
import { Pathfinder } from './pathfinding/Pathfinder';
import { MovementPreview } from './render/MovementPreview';
import { MovementExecutor } from './unit/MovementSystem';
import { UnitType, UNIT_TYPE_DATA } from './unit/UnitType';

// Create ECS world
const world = createGameWorld();

// Create unit container (between tile and UI layers)
const unitContainer = new Container();
worldContainer.addChild(unitContainer);

// Initialize unit systems
const unitRenderer = new UnitRenderer(unitContainer, layout);
const selectionState = new SelectionState();
const selectionSystem = new SelectionSystem(layout, camera, world, selectionState);
const pathfinder = new Pathfinder(tileMap);
const movementPreview = new MovementPreview(worldContainer, layout, pathfinder);
const movementExecutor = new MovementExecutor(world, pathfinder, unitRenderer);

// Spawn test units after map generation
function spawnTestUnits() {
  // Find a valid land tile
  for (const [key, tile] of tileMap) {
    if (tile.terrain !== Terrain.Ocean && tile.terrain !== Terrain.Coast && tile.terrain !== Terrain.Mountain) {
      const data = UNIT_TYPE_DATA[UnitType.Warrior];
      const eid = createUnitEntity(world, tile.position.q, tile.position.r, 0, 0, data.movement);
      unitRenderer.createUnitGraphic(eid, tile.position, UnitType.Warrior, 0);
      break;
    }
  }
}

// Wire up selection state changes
selectionState.subscribe((unitEid) => {
  if (unitEid !== null) {
    const q = Position.q[unitEid];
    const r = Position.r[unitEid];
    const mp = MovementComponent.current[unitEid];
    movementPreview.showReachableTiles(new TilePosition(q, r), mp);
  } else {
    movementPreview.hide();
  }
});
```

#### Success Criteria

- [ ] Game initializes with at least one test unit
- [ ] Full selection + movement flow works end-to-end
- [ ] Unit info panel shows when unit selected
- [ ] All tests pass (unit + E2E)
- [ ] No console errors or warnings
- [ ] CLAUDE.md accurately reflects new architecture
- [ ] Code is well-documented with JSDoc

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/unit/UnitType.ts` | Create | Unit type enum and static data |
| `src/unit/UnitData.ts` | Create | Per-unit stats interface |
| `src/unit/MovementSystem.ts` | Create | Movement execution logic |
| `src/unit/index.ts` | Create | Module exports |
| `src/ecs/world.ts` | Modify | Add Unit, Movement, Owner components |
| `src/ecs/unitSystems.ts` | Create | Unit queries and systems |
| `src/render/UnitRenderer.ts` | Create | Unit graphics management |
| `src/render/SelectionHighlight.ts` | Create | Selection visual indicator |
| `src/render/MovementPreview.ts` | Create | Movement range/path visualization |
| `src/ui/SelectionState.ts` | Create | Selected unit reactive state |
| `src/ui/SelectionSystem.ts` | Create | Click-to-select handling |
| `src/ui/UnitInfoPanel.ts` | Create | Selected unit info display |
| `src/ui/index.ts` | Modify | Export new UI modules |
| `src/pathfinding/Pathfinder.ts` | Create | A* pathfinding implementation |
| `src/pathfinding/MovementCost.ts` | Create | Cost calculation helpers |
| `src/pathfinding/index.ts` | Create | Module exports |
| `src/tile/TileFeature.ts` | Modify | Add movement cost to FEATURE_DATA |
| `src/main.ts` | Modify | Integrate all unit systems |
| `index.html` | Modify | Add unit info panel DOM |
| `src/style.css` | Modify | Add unit panel styles |
| `CLAUDE.md` | Modify | Document new modules |

**Total: 15 files to create, 6 files to modify**

---

## Success Criteria

### Functional Requirements
- [ ] Units spawn on map and render correctly
- [ ] Clicking unit selects it with visual feedback
- [ ] Selected unit shows reachable tile highlights
- [ ] Hovering shows path preview to target
- [ ] Right-click moves unit along path
- [ ] Movement costs are calculated correctly (terrain + features)
- [ ] Movement points are consumed and reset on turn

### Performance Requirements
- [ ] Pathfinding completes in <50ms for typical paths
- [ ] Movement preview updates at 60fps
- [ ] Unit rendering adds negligible overhead

### Code Quality Requirements
- [ ] All new modules have unit tests
- [ ] E2E test covers select-move-deselect flow
- [ ] No TypeScript errors or ESLint warnings
- [ ] Public functions have JSDoc comments

---

## Dependencies & Integration

### Depends On
- `TilePosition` - Hex math (neighbors, distance) - Already implemented
- `HexGridLayout` - World coordinate conversion - Already implemented
- `TERRAIN_DATA.movementCost` - Movement costs - Already implemented
- `HoverSystem` - Screen-to-hex conversion pattern - Already implemented
- `HoverState` - Reactive state pattern - Already implemented
- bitECS - ECS primitives - Already configured

### Consumed By (Future Phases)
- **Phase 4 (Cities)**: Settler unit founds cities
- **Phase 6 (Combat)**: Unit strength used for combat calculations
- **Phase 8 (Fog of War)**: Units provide vision radius
- **Networking**: Movement commands sent to server for validation

### Integration Points
- **ECS World**: Units are entities with components
- **PixiJS Containers**: Unit layer between tiles and UI
- **DOM Overlays**: Unit info panel
- **Game Loop**: Movement animation (if implemented)

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Pathfinding too slow on large maps | Medium | Low | Implement path caching; limit search radius |
| Unit stacking ambiguity | Medium | Medium | Decide on stacking rules (1 unit per tile for now) |
| Selection conflicts with camera panning | Low | Medium | Use click vs drag detection |
| Z-ordering issues (units under tiles) | Medium | Low | Explicit container layering |
| Movement animation complexity | Low | Medium | Start with instant teleport; add animation later |
| ECS query performance | Low | Low | bitECS is optimized; cache queries if needed |

---

## Testing Strategy

### Unit Tests
- `UnitType.test.ts` - Unit data integrity
- `Pathfinder.test.ts` - A* correctness, edge cases, cost calculation
- `MovementSystem.test.ts` - Move validation, MP deduction
- `SelectionState.test.ts` - State transitions, listener notifications

### E2E Tests
- `unit-selection.spec.ts` - Click to select, Escape to deselect
- `unit-movement.spec.ts` - Select, hover (see path), right-click to move
- `movement-preview.spec.ts` - Reachable tiles highlight correctly

---

## Appendix: Unit Type Reference

| Unit | Movement | Strength | Notes |
|------|----------|----------|-------|
| Warrior | 2 | 8 | Basic melee unit |
| Scout | 3 | 5 | Fast exploration |
| Settler | 2 | 0 | Founds cities |

More unit types (Archer, Spearman, etc.) can be added in Phase 6 (Combat).

## Appendix: Movement Cost Reference

| Terrain/Feature | Cost | Notes |
|-----------------|------|-------|
| Flat land (Grassland, Plains, etc.) | 1 | Base movement |
| Hills | 2 | +1 over flat |
| Forest | +1 | Added to terrain |
| Jungle | +1 | Added to terrain |
| Mountains | Impassable | Land units cannot enter |
| Water | Impassable | Until naval units |
| Rivers | +1 (future) | Not yet implemented |
