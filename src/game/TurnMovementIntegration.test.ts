import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, Position, MovementComponent } from '../ecs/world';
import { MovementExecutor } from '../unit/MovementSystem';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { UnitRenderer } from '../render/UnitRenderer';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { GeneratedTile } from '../map/MapGenerator';
import { UnitType } from '../unit/UnitType';
import { GameState } from './GameState';
import { TurnSystem } from './TurnSystem';

function createTile(q: number, r: number, terrain: Terrain): GeneratedTile {
  return {
    position: new TilePosition(q, r),
    terrain,
    feature: null,
    resource: null,
  };
}

// Mock UnitRenderer
const mockUnitRenderer = {
  updatePosition: vi.fn(),
} as unknown as UnitRenderer;

describe('Turn-Movement Integration', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let executor: MovementExecutor;
  let gameState: GameState;
  let turnSystem: TurnSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    world = createGameWorld();
    tileMap = new Map();

    // Create a simple grid of passable tiles
    for (let q = 0; q <= 5; q++) {
      for (let r = 0; r <= 5; r++) {
        tileMap.set(`${q},${r}`, createTile(q, r, Terrain.Grassland));
      }
    }

    pathfinder = new Pathfinder(tileMap);
    executor = new MovementExecutor(world, pathfinder, mockUnitRenderer);

    gameState = new GameState();
    turnSystem = new TurnSystem(gameState, {
      onTurnStart: () => {
        executor.resetAllMovementPoints();
      },
    });
    turnSystem.attach();
  });

  it('should reset unit movement points on turn start', () => {
    // Setup: Create unit with movement points
    const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
    expect(MovementComponent.current[eid]).toBe(2);

    // Move unit to consume movement points
    executor.executeMove(eid, new TilePosition(1, 0));
    expect(MovementComponent.current[eid]).toBe(1);

    // Move again to exhaust movement
    executor.executeMove(eid, new TilePosition(2, 0));
    expect(MovementComponent.current[eid]).toBe(0);

    // Advance turn
    gameState.nextTurn();

    // Assert: Movement points restored to max
    expect(MovementComponent.current[eid]).toBe(2);
  });

  it('should reset all units movement points', () => {
    // Setup: Create multiple units
    const eid1 = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
    const eid2 = createUnitEntity(world, 3, 3, UnitType.Scout, 0, 3);

    // Move all units to consume movement
    executor.executeMove(eid1, new TilePosition(1, 0));
    MovementComponent.current[eid1] = 0; // Exhaust completely

    executor.executeMove(eid2, new TilePosition(4, 3));
    MovementComponent.current[eid2] = 0; // Exhaust completely

    expect(MovementComponent.current[eid1]).toBe(0);
    expect(MovementComponent.current[eid2]).toBe(0);

    // Advance turn
    gameState.nextTurn();

    // Assert: All units have movement points restored
    expect(MovementComponent.current[eid1]).toBe(2);
    expect(MovementComponent.current[eid2]).toBe(3);
  });

  it('should allow unit to move again after turn advance', () => {
    // Setup: Create unit
    const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

    // Move unit to exhaust movement
    executor.executeMove(eid, new TilePosition(1, 0));
    executor.executeMove(eid, new TilePosition(2, 0));
    expect(MovementComponent.current[eid]).toBe(0);

    // Verify unit cannot move
    expect(executor.canMove(eid, new TilePosition(3, 0))).toBe(false);

    // Advance turn
    gameState.nextTurn();

    // Assert: Unit can move again
    expect(executor.canMove(eid, new TilePosition(3, 0))).toBe(true);

    // Execute the move
    const result = executor.executeMove(eid, new TilePosition(3, 0));
    expect(result).toBe(true);
    expect(Position.q[eid]).toBe(3);
  });

  it('should handle multiple turn transitions', () => {
    const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

    // Turn 1: Move and exhaust
    executor.executeMove(eid, new TilePosition(1, 0));
    MovementComponent.current[eid] = 0;
    expect(gameState.getTurnNumber()).toBe(1);

    // Turn 2
    gameState.nextTurn();
    expect(gameState.getTurnNumber()).toBe(2);
    expect(MovementComponent.current[eid]).toBe(2);
    MovementComponent.current[eid] = 0;

    // Turn 3
    gameState.nextTurn();
    expect(gameState.getTurnNumber()).toBe(3);
    expect(MovementComponent.current[eid]).toBe(2);
  });

  it('should handle empty world gracefully', () => {
    // No units created, just advance turn
    // Should not throw
    expect(() => gameState.nextTurn()).not.toThrow();
    expect(gameState.getTurnNumber()).toBe(2);
  });
});
