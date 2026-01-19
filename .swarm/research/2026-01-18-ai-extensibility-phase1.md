# Research: AI Extensibility - Phase 1 Foundation

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research provides detailed implementation guidance for Phase 1 of the AI extensibility system. Phase 1 focuses on creating the Action Registry, defining AIContext, and implementing the base AI Controller. The existing command system with validators/executors provides an excellent foundation, and the state query infrastructure already produces the snapshots needed for AI decision-making.

## Key Discoveries

### 1. Command System Architecture

The existing command system at `/Users/alex/workspace/civ/src/engine/commands/` is well-structured:

- **5 Command Types** defined in `types.ts` (lines 56-62):
  - `MOVE_UNIT` - Move a unit to a target hex
  - `ATTACK` - Attack an enemy unit
  - `FOUND_CITY` - Found a city with a settler
  - `SET_PRODUCTION` - Set production for a city
  - `END_TURN` - End the current player's turn

- **Validator Registry** at `validators/index.ts` uses switch-based dispatch (lines 42-61)
- **Executor Registry** at `executors/index.ts` follows the same pattern (lines 42-61)
- **GameEngine.executeCommand()** at `GameEngine.ts` (lines 345-366) orchestrates validation and execution

### 2. State Query Infrastructure

The state query system at `/Users/alex/workspace/civ/src/engine/state/queries.ts` already provides:

- `queryUnits(world, playerId?)` - Returns `UnitSnapshot[]` with capabilities (line 53-88)
- `queryCities(world, territoryManager, tileMap, playerId?)` - Returns `CitySnapshot[]` (line 125-190)
- `queryTile(tileMap, world, territoryManager, q, r)` - Returns `TileSnapshot` (line 255-298)
- `queryGameState(gameState, playerCount)` - Returns `GameStateSnapshot` (line 41-48)

### 3. Snapshot Types with Capabilities

`UnitSnapshot` at `snapshots.ts` (lines 22-35) already includes AI-relevant data:

```typescript
export interface UnitSnapshot {
  eid: number;
  type: UnitType;
  typeName: string;
  owner: number;
  position: { q: number; r: number };
  health: { current: number; max: number };
  movement: { current: number; max: number };
  capabilities: {
    canMove: boolean;      // Movement points > 0
    canAttack: boolean;    // Has combat strength and movement
    canFoundCity: boolean; // Unit is a Settler
  };
}
```

### 4. Pathfinder Integration

`Pathfinder` at `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` provides:

- `findPath(start, end, maxMovement)` - A* pathfinding (lines 79-150)
- `getReachableTiles(start, movement)` - BFS for all reachable tiles (lines 191-216)
- `getMovementCost(position)` - Terrain cost calculation (lines 47-63)

### 5. Combat Calculator

`calculateCombat()` at `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts` (lines 48-100):

- Pure function, no side effects
- Takes `CombatContext` with attacker/defender stats
- Returns `CombatResult` with damage predictions
- Perfect for AI combat evaluation

### 6. Validator Dependency Patterns

Each validator has typed dependencies:

| Command | Validator Deps | Key Data |
|---------|---------------|----------|
| MOVE_UNIT | `{world, pathfinder}` | Pathfinder for reachability |
| ATTACK | `{world, gameState}` | Game phase check |
| FOUND_CITY | `{world, tileMap}` | Terrain validation |
| SET_PRODUCTION | `{world}` | City existence |
| END_TURN | `{gameState}` | Current player check |

## Architecture Overview

### Proposed Directory Structure

```
src/ai/
  index.ts                      # Module exports

  registry/
    ActionDefinition.ts         # ActionDefinition interface
    ActionRegistry.ts           # ActionRegistry singleton

  actions/
    index.ts                    # Auto-registers all actions
    MoveAction.ts               # Move unit action
    AttackAction.ts             # Attack action
    FoundCityAction.ts          # Found city action
    SetProductionAction.ts      # Set production action
    EndTurnAction.ts            # End turn action (player-level)

  context/
    AIContext.ts                # AIContext interface
    ContextBuilder.ts           # Build context from game state

  controller/
    AIController.ts             # Main AI coordinator
```

## Detailed Implementation Specifications

### 1. ActionDefinition Interface

```typescript
// Proposed: src/ai/registry/ActionDefinition.ts

import { GameCommand, CommandType } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';

/** Entity types that can perform actions */
export type EntityType = 'unit' | 'city' | 'player';

/**
 * Self-describing action definition.
 * Each action knows how to generate and score candidates.
 */
export interface ActionDefinition<TCommand extends GameCommand = GameCommand> {
  /** Unique action identifier (matches COMMAND_TYPES) */
  id: string;

  /** Command type this action produces */
  commandType: CommandType;

  /** Human-readable description */
  description: string;

  /** What entity types can perform this action */
  applicableTo: EntityType[];

  /**
   * Generate candidate commands for a given context.
   * @param context - AI decision context
   * @param entityEid - Entity to generate actions for (unit/city eid, or -1 for player-level)
   * @returns Array of valid command candidates
   */
  generateCandidates: (context: AIContext, entityEid: number) => TCommand[];

  /**
   * Score a candidate command (higher = preferred).
   * @param context - AI decision context
   * @param command - Command to score
   * @returns Score value (typically 0-100)
   */
  scoreCandidate: (context: AIContext, command: TCommand) => number;
}
```

### 2. ActionRegistry Implementation

```typescript
// Proposed: src/ai/registry/ActionRegistry.ts

import { GameCommand } from '../../engine/commands/types';
import { ActionDefinition, EntityType } from './ActionDefinition';

/**
 * Central registry for all AI action definitions.
 * Actions self-register, enabling extensibility.
 */
export class ActionRegistry {
  private static instance: ActionRegistry | null = null;
  private actions = new Map<string, ActionDefinition>();

  private constructor() {}

  /** Get singleton instance */
  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /** Reset instance (for testing) */
  static resetInstance(): void {
    ActionRegistry.instance = null;
  }

  /**
   * Register an action definition.
   * @throws Error if action with same ID already registered
   */
  register<T extends GameCommand>(definition: ActionDefinition<T>): void {
    if (this.actions.has(definition.id)) {
      throw new Error(`Action '${definition.id}' is already registered`);
    }
    this.actions.set(definition.id, definition as ActionDefinition);
  }

  /**
   * Get action definition by ID.
   */
  getAction(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all actions applicable to a given entity type.
   */
  getActionsFor(entityType: EntityType): ActionDefinition[] {
    return [...this.actions.values()]
      .filter(a => a.applicableTo.includes(entityType));
  }

  /**
   * Get all registered actions.
   */
  getAllActions(): ActionDefinition[] {
    return [...this.actions.values()];
  }

  /**
   * Check if an action is registered.
   */
  hasAction(id: string): boolean {
    return this.actions.has(id);
  }

  /**
   * Get count of registered actions.
   */
  getActionCount(): number {
    return this.actions.size;
  }
}

/** Convenience function to get registry instance */
export function getActionRegistry(): ActionRegistry {
  return ActionRegistry.getInstance();
}
```

### 3. AIContext Interface

```typescript
// Proposed: src/ai/context/AIContext.ts

import { IWorld } from 'bitecs';
import { GameState } from '../../game/GameState';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { TerritoryManager } from '../../city/Territory';
import { UnitSnapshot, CitySnapshot, TileSnapshot } from '../../engine/state/snapshots';

/**
 * Context for AI decision-making.
 * Provides all data needed to evaluate and generate actions.
 */
export interface AIContext {
  // Core references (read-only access to game state)
  readonly world: IWorld;
  readonly playerId: number;
  readonly gameState: GameState;
  readonly tileMap: Map<string, GeneratedTile>;
  readonly pathfinder: Pathfinder;
  readonly territoryManager: TerritoryManager;

  // Cached queries (computed once per AI turn)
  readonly myUnits: UnitSnapshot[];
  readonly myCities: CitySnapshot[];
  readonly enemyUnits: Map<number, UnitSnapshot[]>;  // playerId -> units
  readonly enemyCities: Map<number, CitySnapshot[]>; // playerId -> cities

  // Helper methods
  getTile(q: number, r: number): TileSnapshot | null;
  getEnemyUnitAt(q: number, r: number): UnitSnapshot | null;
  getAdjacentEnemies(q: number, r: number): UnitSnapshot[];
}
```

### 4. ContextBuilder Implementation

```typescript
// Proposed: src/ai/context/ContextBuilder.ts

import { IWorld } from 'bitecs';
import { AIContext } from './AIContext';
import { GameState } from '../../game/GameState';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { TerritoryManager } from '../../city/Territory';
import { queryUnits, queryCities, queryTile } from '../../engine/state/queries';
import { UnitSnapshot, CitySnapshot, TileSnapshot } from '../../engine/state/snapshots';
import { TilePosition } from '../../hex/TilePosition';
import { PlayerManager } from '../../player';

export interface ContextBuilderDeps {
  world: IWorld;
  gameState: GameState;
  tileMap: Map<string, GeneratedTile>;
  pathfinder: Pathfinder;
  territoryManager: TerritoryManager;
  playerManager: PlayerManager;
}

/**
 * Build AIContext from game state.
 * Caches all queries needed for AI decision-making.
 */
export function buildAIContext(playerId: number, deps: ContextBuilderDeps): AIContext {
  const { world, gameState, tileMap, pathfinder, territoryManager, playerManager } = deps;

  // Query own units and cities
  const myUnits = queryUnits(world, playerId);
  const myCities = queryCities(world, territoryManager, tileMap, playerId);

  // Query enemy units and cities
  const enemyUnits = new Map<number, UnitSnapshot[]>();
  const enemyCities = new Map<number, CitySnapshot[]>();

  for (const player of playerManager.getActivePlayers()) {
    if (player.id !== playerId) {
      enemyUnits.set(player.id, queryUnits(world, player.id));
      enemyCities.set(player.id, queryCities(world, territoryManager, tileMap, player.id));
    }
  }

  // Build lookup for enemy units by position
  const enemyUnitsByPosition = new Map<string, UnitSnapshot>();
  for (const units of enemyUnits.values()) {
    for (const unit of units) {
      const key = `${unit.position.q},${unit.position.r}`;
      enemyUnitsByPosition.set(key, unit);
    }
  }

  return {
    world,
    playerId,
    gameState,
    tileMap,
    pathfinder,
    territoryManager,
    myUnits,
    myCities,
    enemyUnits,
    enemyCities,

    getTile(q: number, r: number): TileSnapshot | null {
      return queryTile(tileMap, world, territoryManager, q, r);
    },

    getEnemyUnitAt(q: number, r: number): UnitSnapshot | null {
      const key = `${q},${r}`;
      return enemyUnitsByPosition.get(key) ?? null;
    },

    getAdjacentEnemies(q: number, r: number): UnitSnapshot[] {
      const pos = new TilePosition(q, r);
      const adjacent: UnitSnapshot[] = [];
      for (const neighbor of pos.neighbors()) {
        const enemy = enemyUnitsByPosition.get(neighbor.key());
        if (enemy) {
          adjacent.push(enemy);
        }
      }
      return adjacent;
    },
  };
}
```

### 5. Action Definitions (Examples)

#### MoveAction

```typescript
// Proposed: src/ai/actions/MoveAction.ts

import { MoveUnitCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { ActionDefinition } from '../registry/ActionDefinition';
import { getActionRegistry } from '../registry/ActionRegistry';
import { AIContext } from '../context/AIContext';
import { TilePosition } from '../../hex/TilePosition';

export const MoveAction: ActionDefinition<MoveUnitCommand> = {
  id: 'MOVE_UNIT',
  commandType: COMMAND_TYPES.MOVE_UNIT,
  description: 'Move unit to a new position',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, unitEid: number): MoveUnitCommand[] {
    const unit = context.myUnits.find(u => u.eid === unitEid);
    if (!unit || !unit.capabilities.canMove) {
      return [];
    }

    const { q, r } = unit.position;
    const currentPos = new TilePosition(q, r);
    const reachable = context.pathfinder.getReachableTiles(currentPos, unit.movement.current);

    const candidates: MoveUnitCommand[] = [];
    for (const [key] of reachable) {
      if (key === currentPos.key()) continue; // Skip current position

      const [targetQ, targetR] = key.split(',').map(Number);
      candidates.push({
        type: 'MOVE_UNIT',
        playerId: context.playerId,
        unitEid,
        targetQ,
        targetR,
      });
    }

    return candidates;
  },

  scoreCandidate(context: AIContext, command: MoveUnitCommand): number {
    // Base score - will be refined by scoring modules in Phase 2
    return 10;
  },
};

// Auto-register on import
getActionRegistry().register(MoveAction);
```

#### AttackAction

```typescript
// Proposed: src/ai/actions/AttackAction.ts

import { AttackCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { ActionDefinition } from '../registry/ActionDefinition';
import { getActionRegistry } from '../registry/ActionRegistry';
import { AIContext } from '../context/AIContext';
import { calculateCombat, CombatContext } from '../../combat/CombatCalculator';
import { getTotalDefenseModifier } from '../../combat/CombatModifiers';
import { UNIT_TYPE_DATA, UnitType } from '../../unit/UnitType';

export const AttackAction: ActionDefinition<AttackCommand> = {
  id: 'ATTACK',
  commandType: COMMAND_TYPES.ATTACK,
  description: 'Attack an adjacent enemy unit',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, unitEid: number): AttackCommand[] {
    const unit = context.myUnits.find(u => u.eid === unitEid);
    if (!unit || !unit.capabilities.canAttack) {
      return [];
    }

    // Find adjacent enemies
    const adjacentEnemies = context.getAdjacentEnemies(unit.position.q, unit.position.r);

    return adjacentEnemies.map(enemy => ({
      type: 'ATTACK',
      playerId: context.playerId,
      attackerEid: unitEid,
      defenderEid: enemy.eid,
    }));
  },

  scoreCandidate(context: AIContext, command: AttackCommand): number {
    const attacker = context.myUnits.find(u => u.eid === command.attackerEid);
    if (!attacker) return 0;

    // Find defender in enemy units
    let defender: { eid: number; type: UnitType; health: { current: number; max: number }; position: { q: number; r: number } } | null = null;
    for (const units of context.enemyUnits.values()) {
      const found = units.find(u => u.eid === command.defenderEid);
      if (found) {
        defender = found;
        break;
      }
    }
    if (!defender) return 0;

    // Get tile for defense modifier
    const defenderTile = context.tileMap.get(`${defender.position.q},${defender.position.r}`);
    const defenseModifier = defenderTile ? getTotalDefenseModifier(defenderTile) : 0;

    const attackerData = UNIT_TYPE_DATA[attacker.type as UnitType];
    const defenderData = UNIT_TYPE_DATA[defender.type as UnitType];

    // Simulate combat
    const combatContext: CombatContext = {
      attackerStrength: attackerData.strength,
      defenderStrength: defenderData.strength,
      attackerHealth: attacker.health.current,
      defenderHealth: defender.health.current,
      defenseModifier,
    };

    const result = calculateCombat(combatContext);

    // Score based on combat outcome
    let score = 50; // Base score for attacking

    // Bonus for killing enemy
    if (!result.defenderSurvives) {
      score += 30;
    }

    // Penalty for dying
    if (!result.attackerSurvives) {
      score -= 40;
    }

    // Favor high damage ratio
    const damageRatio = result.defenderDamage / Math.max(1, result.attackerDamage);
    score += Math.min(20, damageRatio * 5);

    return Math.max(0, score);
  },
};

// Auto-register on import
getActionRegistry().register(AttackAction);
```

#### FoundCityAction

```typescript
// Proposed: src/ai/actions/FoundCityAction.ts

import { FoundCityCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { ActionDefinition } from '../registry/ActionDefinition';
import { getActionRegistry } from '../registry/ActionRegistry';
import { AIContext } from '../context/AIContext';
import { UnitType } from '../../unit/UnitType';
import { canFoundCity } from '../../city/CityFounder';

export const FoundCityAction: ActionDefinition<FoundCityCommand> = {
  id: 'FOUND_CITY',
  commandType: COMMAND_TYPES.FOUND_CITY,
  description: 'Found a city with the settler',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, unitEid: number): FoundCityCommand[] {
    const unit = context.myUnits.find(u => u.eid === unitEid);
    if (!unit || unit.type !== UnitType.Settler) {
      return [];
    }

    // Check if settler can found city at current position
    if (!canFoundCity(context.world, unitEid, context.tileMap)) {
      return [];
    }

    return [{
      type: 'FOUND_CITY',
      playerId: context.playerId,
      settlerEid: unitEid,
    }];
  },

  scoreCandidate(context: AIContext, command: FoundCityCommand): number {
    // Base score - will be refined by settlement scoring in Phase 2
    // For now, founding cities is high priority
    return 70;
  },
};

// Auto-register on import
getActionRegistry().register(FoundCityAction);
```

#### SetProductionAction

```typescript
// Proposed: src/ai/actions/SetProductionAction.ts

import { SetProductionCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { ActionDefinition } from '../registry/ActionDefinition';
import { getActionRegistry } from '../registry/ActionRegistry';
import { AIContext } from '../context/AIContext';
import { BuildableType, getAvailableBuildables } from '../../city/Buildable';

export const SetProductionAction: ActionDefinition<SetProductionCommand> = {
  id: 'SET_PRODUCTION',
  commandType: COMMAND_TYPES.SET_PRODUCTION,
  description: 'Set city production',
  applicableTo: ['city'],

  generateCandidates(context: AIContext, cityEid: number): SetProductionCommand[] {
    const city = context.myCities.find(c => c.eid === cityEid);
    if (!city) {
      return [];
    }

    // Generate candidate for each buildable type
    const buildables = getAvailableBuildables();
    return buildables.map(buildableType => ({
      type: 'SET_PRODUCTION',
      playerId: context.playerId,
      cityEid,
      buildableType,
    }));
  },

  scoreCandidate(context: AIContext, command: SetProductionCommand): number {
    // Basic scoring - will be refined in Phase 2
    switch (command.buildableType) {
      case BuildableType.Warrior:
        return 50; // Military unit
      case BuildableType.Scout:
        return 30; // Exploration
      case BuildableType.Settler:
        return context.myCities.length < 3 ? 80 : 40; // Expansion priority early
      default:
        return 10;
    }
  },
};

// Auto-register on import
getActionRegistry().register(SetProductionAction);
```

#### EndTurnAction

```typescript
// Proposed: src/ai/actions/EndTurnAction.ts

import { EndTurnCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { ActionDefinition } from '../registry/ActionDefinition';
import { getActionRegistry } from '../registry/ActionRegistry';
import { AIContext } from '../context/AIContext';

export const EndTurnAction: ActionDefinition<EndTurnCommand> = {
  id: 'END_TURN',
  commandType: COMMAND_TYPES.END_TURN,
  description: 'End the current turn',
  applicableTo: ['player'],

  generateCandidates(context: AIContext, _entityEid: number): EndTurnCommand[] {
    // Always available as a player-level action
    return [{
      type: 'END_TURN',
      playerId: context.playerId,
    }];
  },

  scoreCandidate(context: AIContext, _command: EndTurnCommand): number {
    // Low base score - only end turn when nothing else to do
    // Check if any units have actions remaining
    const unitsWithActions = context.myUnits.filter(u =>
      u.capabilities.canMove || u.capabilities.canAttack || u.capabilities.canFoundCity
    );

    // End turn is more attractive if no units have actions
    return unitsWithActions.length === 0 ? 100 : 1;
  },
};

// Auto-register on import
getActionRegistry().register(EndTurnAction);
```

### 6. Base AI Controller

```typescript
// Proposed: src/ai/controller/AIController.ts

import { IWorld } from 'bitecs';
import { GameCommand } from '../../engine/commands/types';
import { GameEngine } from '../../engine/GameEngine';
import { AIContext } from '../context/AIContext';
import { buildAIContext, ContextBuilderDeps } from '../context/ContextBuilder';
import { getActionRegistry } from '../registry/ActionRegistry';
import { ActionDefinition } from '../registry/ActionDefinition';

export interface ScoredAction {
  command: GameCommand;
  score: number;
  actionId: string;
}

/**
 * Base AI controller that uses the action registry to make decisions.
 */
export class AIController {
  private engine: GameEngine;
  private deps: ContextBuilderDeps;

  constructor(engine: GameEngine, deps: ContextBuilderDeps) {
    this.engine = engine;
    this.deps = deps;
  }

  /**
   * Execute one AI turn for the given player.
   * Iteratively selects and executes actions until no more actions available.
   */
  executeTurn(playerId: number): void {
    let actionsExecuted = 0;
    const maxActions = 100; // Safety limit

    while (actionsExecuted < maxActions) {
      // Build fresh context each iteration (state may have changed)
      const context = buildAIContext(playerId, this.deps);

      // Get best action
      const bestAction = this.selectBestAction(context);
      if (!bestAction || bestAction.actionId === 'END_TURN') {
        // No more actions or best action is to end turn
        this.engine.executeCommand({
          type: 'END_TURN',
          playerId,
        });
        break;
      }

      // Execute the action
      const result = this.engine.executeCommand(bestAction.command);
      if (!result.success) {
        console.warn(`AI action failed: ${result.error}`);
        // Continue to try other actions
      }

      actionsExecuted++;
    }
  }

  /**
   * Select the best action from all available candidates.
   */
  selectBestAction(context: AIContext): ScoredAction | null {
    const registry = getActionRegistry();
    const allCandidates: ScoredAction[] = [];

    // Generate unit actions
    for (const unit of context.myUnits) {
      const unitActions = registry.getActionsFor('unit');
      for (const action of unitActions) {
        const candidates = action.generateCandidates(context, unit.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          allCandidates.push({ command, score, actionId: action.id });
        }
      }
    }

    // Generate city actions
    for (const city of context.myCities) {
      const cityActions = registry.getActionsFor('city');
      for (const action of cityActions) {
        const candidates = action.generateCandidates(context, city.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          allCandidates.push({ command, score, actionId: action.id });
        }
      }
    }

    // Generate player-level actions (like END_TURN)
    const playerActions = registry.getActionsFor('player');
    for (const action of playerActions) {
      const candidates = action.generateCandidates(context, -1);
      for (const command of candidates) {
        const score = action.scoreCandidate(context, command);
        allCandidates.push({ command, score, actionId: action.id });
      }
    }

    // Sort by score descending
    allCandidates.sort((a, b) => b.score - a.score);

    return allCandidates.length > 0 ? allCandidates[0] : null;
  }

  /**
   * Get all scored candidates (useful for debugging/visualization).
   */
  getAllScoredActions(context: AIContext): ScoredAction[] {
    const registry = getActionRegistry();
    const allCandidates: ScoredAction[] = [];

    for (const unit of context.myUnits) {
      const unitActions = registry.getActionsFor('unit');
      for (const action of unitActions) {
        const candidates = action.generateCandidates(context, unit.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          allCandidates.push({ command, score, actionId: action.id });
        }
      }
    }

    for (const city of context.myCities) {
      const cityActions = registry.getActionsFor('city');
      for (const action of cityActions) {
        const candidates = action.generateCandidates(context, city.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          allCandidates.push({ command, score, actionId: action.id });
        }
      }
    }

    const playerActions = registry.getActionsFor('player');
    for (const action of playerActions) {
      const candidates = action.generateCandidates(context, -1);
      for (const command of candidates) {
        const score = action.scoreCandidate(context, command);
        allCandidates.push({ command, score, actionId: action.id });
      }
    }

    return allCandidates.sort((a, b) => b.score - a.score);
  }
}
```

### 7. Module Index Files

```typescript
// Proposed: src/ai/actions/index.ts
// Import all actions to trigger auto-registration
import './MoveAction';
import './AttackAction';
import './FoundCityAction';
import './SetProductionAction';
import './EndTurnAction';

// Re-export for direct access if needed
export { MoveAction } from './MoveAction';
export { AttackAction } from './AttackAction';
export { FoundCityAction } from './FoundCityAction';
export { SetProductionAction } from './SetProductionAction';
export { EndTurnAction } from './EndTurnAction';
```

```typescript
// Proposed: src/ai/index.ts
// Import actions to trigger registration
import './actions';

// Export public API
export { ActionDefinition, EntityType } from './registry/ActionDefinition';
export { ActionRegistry, getActionRegistry } from './registry/ActionRegistry';
export { AIContext } from './context/AIContext';
export { buildAIContext, ContextBuilderDeps } from './context/ContextBuilder';
export { AIController, ScoredAction } from './controller/AIController';
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Command definitions (lines 48-62) |
| `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts` | Validator registry pattern (lines 42-61) |
| `/Users/alex/workspace/civ/src/engine/commands/executors/index.ts` | Executor registry pattern (lines 42-61) |
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Command execution (lines 345-366) |
| `/Users/alex/workspace/civ/src/engine/state/queries.ts` | State query functions (lines 53-88, 125-190) |
| `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Snapshot types with capabilities (lines 22-35) |
| `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` | Pathfinding (lines 79-150, 191-216) |
| `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts` | Combat calculation (lines 48-100) |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | City founding validation (lines 28-66) |
| `/Users/alex/workspace/civ/src/player/PlayerManager.ts` | Player management (lines 26-40, 92-105) |

## Recommendations

### Implementation Order

1. **Create directory structure**: `src/ai/registry/`, `src/ai/actions/`, `src/ai/context/`, `src/ai/controller/`

2. **Implement ActionDefinition interface** first - it's the foundation

3. **Implement ActionRegistry** with singleton pattern and tests

4. **Implement AIContext and ContextBuilder** - these depend on existing queries

5. **Implement action definitions one at a time**, starting with simpler ones:
   - EndTurnAction (simplest, player-level)
   - SetProductionAction (city-level, few candidates)
   - FoundCityAction (unit-level, binary decision)
   - MoveAction (unit-level, many candidates)
   - AttackAction (unit-level, requires combat simulation)

6. **Implement AIController** last - it orchestrates everything

### Testing Strategy

- Unit test ActionRegistry in isolation
- Unit test each ActionDefinition's `generateCandidates` and `scoreCandidate` with mock contexts
- Integration test AIController with real game state
- Add test for auto-registration of actions via import

### Dependencies to Add

The implementation uses only existing code - no new dependencies needed.

## Open Questions

1. **Score normalization**: Should all action scores be normalized to 0-100 range, or allow arbitrary values?

2. **Tie-breaking**: When multiple actions have the same score, should we randomize or use a secondary criterion?

3. **Action filtering**: Should we filter out obviously bad actions (score < threshold) before scoring all candidates?

4. **Per-unit tracking**: Should we track which units have acted this turn to avoid re-evaluating them?

5. **Production decision timing**: Should SET_PRODUCTION be evaluated only when city has no production, or every turn?

6. **Testing AI turns**: Should we add a debug mode to visualize AI decision-making?
