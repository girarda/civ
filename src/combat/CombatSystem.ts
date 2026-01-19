/**
 * Combat execution system.
 * Handles attack validation, execution, and unit cleanup after combat.
 */

import { IWorld, removeEntity } from 'bitecs';
import { Position, MovementComponent, UnitComponent } from '../ecs/world';
import { getUnitAtPosition, getUnitOwner, getUnitHealth, setUnitHealth } from '../ecs/unitSystems';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';
import { UnitRenderer } from '../render/UnitRenderer';
import { SelectionState } from '../ui/SelectionState';
import { GameState } from '../game/GameState';
import { TurnPhase } from '../game/TurnPhase';
import { UNIT_TYPE_DATA, UnitType } from '../unit/UnitType';
import { calculateCombat, CombatResult, CombatContext } from './CombatCalculator';
import { getTotalDefenseModifier } from './CombatModifiers';
import { PlayerManager } from '../player';

export class CombatExecutor {
  private world: IWorld;
  private tileMap: Map<string, GeneratedTile>;
  private unitRenderer: UnitRenderer;
  private selectionState: SelectionState;
  private gameState: GameState;
  private playerManager: PlayerManager | null;

  constructor(
    world: IWorld,
    tileMap: Map<string, GeneratedTile>,
    unitRenderer: UnitRenderer,
    selectionState: SelectionState,
    gameState: GameState,
    playerManager?: PlayerManager
  ) {
    this.world = world;
    this.tileMap = tileMap;
    this.unitRenderer = unitRenderer;
    this.selectionState = selectionState;
    this.gameState = gameState;
    this.playerManager = playerManager ?? null;
  }

  /**
   * Check if an attack can be made from attacker to target position.
   */
  canAttack(attackerEid: number, targetPos: TilePosition): boolean {
    // Cannot attack if game is over
    if (this.gameState.isGameOver()) {
      return false;
    }

    // Must be in PlayerAction phase
    if (this.gameState.getPhase() !== TurnPhase.PlayerAction) {
      return false;
    }

    // Attacker must have movement points
    if (MovementComponent.current[attackerEid] <= 0) {
      return false;
    }

    // Get attacker stats
    const attackerType = UnitComponent.type[attackerEid] as UnitType;
    const attackerData = UNIT_TYPE_DATA[attackerType];

    // Attacker must have combat strength (non-civilian)
    if (attackerData.strength <= 0) {
      return false;
    }

    // Get attacker position
    const attackerPos = new TilePosition(Position.q[attackerEid], Position.r[attackerEid]);

    // Target must be adjacent (melee range = 1)
    if (attackerPos.distanceTo(targetPos) !== 1) {
      return false;
    }

    // Target must have a unit
    const defenderEid = getUnitAtPosition(this.world, targetPos.q, targetPos.r);
    if (defenderEid === null) {
      return false;
    }

    // Target must be an enemy (different owner)
    const attackerOwner = getUnitOwner(attackerEid);
    const defenderOwner = getUnitOwner(defenderEid);
    if (attackerOwner === defenderOwner) {
      return false;
    }

    return true;
  }

  /**
   * Execute an attack from attacker to target position.
   * Returns the combat result or null if attack is not valid.
   */
  executeAttack(attackerEid: number, targetPos: TilePosition): CombatResult | null {
    if (!this.canAttack(attackerEid, targetPos)) {
      return null;
    }

    const defenderEid = getUnitAtPosition(this.world, targetPos.q, targetPos.r)!;

    // Get unit stats
    const attackerType = UnitComponent.type[attackerEid] as UnitType;
    const defenderType = UnitComponent.type[defenderEid] as UnitType;
    const attackerData = UNIT_TYPE_DATA[attackerType];
    const defenderData = UNIT_TYPE_DATA[defenderType];

    // Get health
    const attackerHealth = getUnitHealth(attackerEid);
    const defenderHealth = getUnitHealth(defenderEid);

    // Get defender terrain modifier
    const tileKey = targetPos.key();
    const defenderTile = this.tileMap.get(tileKey);
    const defenseModifier = defenderTile ? getTotalDefenseModifier(defenderTile) : 0;

    // Calculate combat
    const context: CombatContext = {
      attackerStrength: attackerData.strength,
      defenderStrength: defenderData.strength,
      attackerHealth: attackerHealth.current,
      defenderHealth: defenderHealth.current,
      defenseModifier,
    };

    const result = calculateCombat(context);

    // Apply damage
    setUnitHealth(attackerEid, attackerHealth.current - result.attackerDamage);
    setUnitHealth(defenderEid, defenderHealth.current - result.defenderDamage);

    // Consume all movement points (attacking ends turn for unit)
    MovementComponent.current[attackerEid] = 0;

    // Handle unit deaths - defender first, then attacker
    if (!result.defenderSurvives) {
      this.removeUnit(defenderEid);
    }

    if (!result.attackerSurvives) {
      this.removeUnit(attackerEid);
    }

    return result;
  }

  /**
   * Remove a unit from the game (death).
   */
  private removeUnit(eid: number): void {
    // Get owner before removing (for elimination check)
    const playerId = getUnitOwner(eid);

    // Deselect if this unit was selected
    if (this.selectionState.isSelected(eid)) {
      this.selectionState.deselect();
    }

    // Remove from renderer
    this.unitRenderer.removeUnit(eid);

    // Remove from ECS
    removeEntity(this.world, eid);

    // Check for player elimination
    if (this.playerManager) {
      this.playerManager.checkElimination(this.world, playerId);
    }
  }

  /**
   * Check if there's an enemy unit at the target position for the given attacker.
   */
  hasEnemyAt(attackerEid: number, targetPos: TilePosition): boolean {
    const defenderEid = getUnitAtPosition(this.world, targetPos.q, targetPos.r);
    if (defenderEid === null) return false;

    const attackerOwner = getUnitOwner(attackerEid);
    const defenderOwner = getUnitOwner(defenderEid);
    return attackerOwner !== defenderOwner;
  }

  /**
   * Update dependencies (e.g., after map regeneration).
   */
  setWorld(world: IWorld): void {
    this.world = world;
  }

  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  setUnitRenderer(unitRenderer: UnitRenderer): void {
    this.unitRenderer = unitRenderer;
  }

  setPlayerManager(playerManager: PlayerManager): void {
    this.playerManager = playerManager;
  }
}
