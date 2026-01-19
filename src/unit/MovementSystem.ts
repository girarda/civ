/**
 * MovementSystem - Handles unit movement execution.
 */

import { IWorld } from 'bitecs';
import { Position, MovementComponent, unitQuery } from '../ecs/world';
import { TilePosition } from '../hex/TilePosition';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { UnitRenderer } from '../render/UnitRenderer';
import { GameState } from '../game/GameState';

export class MovementExecutor {
  private world: IWorld;
  private pathfinder: Pathfinder;
  private unitRenderer: UnitRenderer;
  private gameState: GameState | null = null;

  constructor(
    world: IWorld,
    pathfinder: Pathfinder,
    unitRenderer: UnitRenderer,
    gameState?: GameState
  ) {
    this.world = world;
    this.pathfinder = pathfinder;
    this.unitRenderer = unitRenderer;
    this.gameState = gameState ?? null;
  }

  /**
   * Get the current position of a unit.
   */
  getUnitPosition(unitEid: number): TilePosition {
    return new TilePosition(Position.q[unitEid], Position.r[unitEid]);
  }

  /**
   * Get the current movement points of a unit.
   */
  getMovementPoints(unitEid: number): number {
    return MovementComponent.current[unitEid];
  }

  /**
   * Check if a unit can move to the target position.
   */
  canMove(unitEid: number, target: TilePosition): boolean {
    // Cannot move if game is over
    if (this.gameState?.isGameOver()) {
      return false;
    }

    const currentPos = this.getUnitPosition(unitEid);
    const currentMP = this.getMovementPoints(unitEid);

    if (currentMP <= 0) return false;
    if (currentPos.equals(target)) return false;

    const result = this.pathfinder.findPath(currentPos, target, currentMP);
    return result.reachable;
  }

  /**
   * Execute movement of a unit to the target position.
   * @returns true if movement was successful, false otherwise
   */
  executeMove(unitEid: number, target: TilePosition): boolean {
    if (!this.canMove(unitEid, target)) return false;

    const currentPos = this.getUnitPosition(unitEid);
    const currentMP = this.getMovementPoints(unitEid);

    const result = this.pathfinder.findPath(currentPos, target, currentMP);
    if (!result.reachable) return false;

    // Update ECS components
    Position.q[unitEid] = target.q;
    Position.r[unitEid] = target.r;
    MovementComponent.current[unitEid] = currentMP - result.totalCost;

    // Update renderer
    this.unitRenderer.updatePosition(unitEid, target);

    return true;
  }

  /**
   * Reset movement points to maximum for a unit.
   */
  resetMovementPoints(unitEid: number): void {
    MovementComponent.current[unitEid] = MovementComponent.max[unitEid];
  }

  /**
   * Reset movement points for all units in the world.
   */
  resetAllMovementPoints(): void {
    const units = unitQuery(this.world);
    for (const eid of units) {
      MovementComponent.current[eid] = MovementComponent.max[eid];
    }
  }

  /**
   * Update the world reference.
   */
  setWorld(world: IWorld): void {
    this.world = world;
  }

  /**
   * Update the pathfinder reference.
   */
  setPathfinder(pathfinder: Pathfinder): void {
    this.pathfinder = pathfinder;
  }

  /**
   * Update the unit renderer reference.
   */
  setUnitRenderer(unitRenderer: UnitRenderer): void {
    this.unitRenderer = unitRenderer;
  }

  /**
   * Update the game state reference.
   */
  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }
}
