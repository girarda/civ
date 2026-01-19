# Research: AI Extensibility Architecture

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research explores how to make the AI system for OpenCiv highly extensible, allowing easy addition of new strategies and automatic awareness of new game features. The existing command pattern and ECS architecture provide an excellent foundation. By implementing a self-describing action registry with metadata-driven scoring, the AI can automatically discover and evaluate new actions as they are added to the game.

## Key Discoveries

- **Command pattern already exists**: `GameCommand` types with validators and executors provide clean action abstraction
- **Validation logic is reusable**: Each command has a validator that can be queried to check if an action is possible
- **State queries produce rich snapshots**: `UnitSnapshot.capabilities` already tracks `canMove`, `canAttack`, `canFoundCity`
- **ECS enables entity-centric design**: Unit-level decision making maps naturally to ECS entity queries
- **No AI code exists yet**: Clean slate to implement extensible patterns from the start
- **Combat and pathfinding are already pure functions**: Perfect for AI evaluation without side effects

## Architecture Overview

### Current Command System Structure

```
src/engine/commands/
  types.ts           - Command interface definitions (GameCommand union)
  CommandResult.ts   - ValidationResult, CommandResult types
  validators/        - Per-command validation logic
    index.ts         - getValidator(commandType) registry
  executors/         - Per-command execution logic
    index.ts         - getExecutor(commandType) registry
```

The command system uses a **switch-based registry** pattern:
- `getValidator()` returns appropriate validator function based on command type
- `getExecutor()` returns appropriate executor function based on command type
- Each command has typed dependencies (`MoveUnitValidatorDeps`, etc.)

### Key Integration Points

| Component | Location | AI Relevance |
|-----------|----------|--------------|
| Command Types | `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Defines all possible actions |
| Validators | `/Users/alex/workspace/civ/src/engine/commands/validators/` | Determine action validity |
| State Queries | `/Users/alex/workspace/civ/src/engine/state/queries.ts` | Read game state for evaluation |
| Snapshots | `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Serializable state representations |
| Pathfinder | `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` | Movement evaluation |
| CombatCalculator | `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts` | Combat outcome prediction |

## Patterns for Extensible AI

### Pattern 1: Self-Describing Action Registry

Instead of hardcoded action generators, create a registry where actions self-describe:

```typescript
// Proposed: src/ai/registry/ActionDefinition.ts
export interface ActionDefinition<TCommand extends GameCommand> {
  /** Unique action identifier */
  id: string;

  /** Command type this action produces */
  commandType: CommandType;

  /** Human-readable description */
  description: string;

  /** What entity types can perform this action */
  applicableTo: EntityType[];

  /** Generate candidate commands for a given context */
  generateCandidates: (context: AIContext, entityEid: number) => TCommand[];

  /** Score a candidate command (higher = preferred) */
  scoreCandidate: (context: AIContext, command: TCommand) => number;

  /** Optional: weights for different AI personalities */
  personalityWeights?: Record<AIPersonality, number>;
}

// Registry singleton
export class ActionRegistry {
  private actions = new Map<string, ActionDefinition<GameCommand>>();

  register<T extends GameCommand>(definition: ActionDefinition<T>): void {
    this.actions.set(definition.id, definition as ActionDefinition<GameCommand>);
  }

  getActionsFor(entityType: EntityType): ActionDefinition<GameCommand>[] {
    return [...this.actions.values()]
      .filter(a => a.applicableTo.includes(entityType));
  }

  getAllActions(): ActionDefinition<GameCommand>[] {
    return [...this.actions.values()];
  }
}
```

**Benefits:**
- New actions register themselves, no central switch statement to modify
- Each action encapsulates its own generation and scoring logic
- Supports querying actions by entity type
- Personality weights enable different AI behaviors

### Pattern 2: Decorator-Based Action Registration

Use decorators (or factory functions in TS) for declarative registration:

```typescript
// Proposed: Action definition with decorator-style registration
export const MoveAction = defineAction({
  id: 'MOVE_UNIT',
  commandType: COMMAND_TYPES.MOVE_UNIT,
  description: 'Move unit to a new position',
  applicableTo: ['unit'],

  generateCandidates(context, unitEid) {
    const pos = getUnitPosition(unitEid);
    const movement = getUnitMovement(unitEid);
    const reachable = context.pathfinder.getReachableTiles(
      new TilePosition(pos.q, pos.r),
      movement.current
    );

    return [...reachable.keys()].map(key => {
      const [q, r] = key.split(',').map(Number);
      return {
        type: 'MOVE_UNIT',
        playerId: context.playerId,
        unitEid,
        targetQ: q,
        targetR: r,
      } as MoveUnitCommand;
    });
  },

  scoreCandidate(context, command) {
    // Scoring logic here
    return 0;
  },
});

// Auto-registration on import
actionRegistry.register(MoveAction);
```

### Pattern 3: Metadata-Enriched Commands

Extend command definitions with AI-relevant metadata:

```typescript
// Enhanced command type with metadata
export interface CommandMetadata {
  /** Categories for grouping similar actions */
  categories: ActionCategory[];

  /** Base priority for this action type */
  basePriority: number;

  /** Requirements for this action */
  requirements: {
    entityType?: EntityType[];
    minMovement?: number;
    capabilities?: string[];
  };

  /** Potential outcomes for evaluation */
  outcomes: {
    type: string;
    probability?: number;
    impact: OutcomeImpact;
  }[];
}

export type ActionCategory =
  | 'military'
  | 'expansion'
  | 'economic'
  | 'exploration'
  | 'defensive';

export interface OutcomeImpact {
  territoryDelta?: number;
  unitsDelta?: number;
  citiesDelta?: number;
  resourcesDelta?: number;
  threatReduction?: number;
}
```

### Pattern 4: Automatic Action Discovery via ECS Components

Leverage ECS to make actions discoverable through component presence:

```typescript
// Proposed: ActionCapability component
export const ActionCapability = defineComponent({
  actionMask: Types.ui32,  // Bitmask of available actions
});

// Action IDs map to bit positions
export const ACTION_BITS = {
  MOVE: 1 << 0,
  ATTACK: 1 << 1,
  FOUND_CITY: 1 << 2,
  SET_PRODUCTION: 1 << 3,
  // ... new actions get new bits
} as const;

// System to update capabilities each turn
export function updateActionCapabilities(world: IWorld, context: AIContext): void {
  const units = getAllUnits(world);
  for (const eid of units) {
    let mask = 0;

    // Check each registered action
    for (const action of actionRegistry.getAllActions()) {
      if (action.isAvailable(context, eid)) {
        mask |= ACTION_BITS[action.id];
      }
    }

    ActionCapability.actionMask[eid] = mask;
  }
}
```

**Benefits:**
- O(1) lookup to check if entity can perform action
- Actions are data, not hardcoded logic
- New actions automatically appear in capability checks

### Pattern 5: Strategy Composition

Allow AI strategies to be composed from smaller building blocks:

```typescript
// Proposed: Composable strategy system
export interface Strategy {
  id: string;
  name: string;

  /** Modify scores for all actions */
  modifyScores(
    context: AIContext,
    scoredActions: ScoredAction[]
  ): ScoredAction[];

  /** Priority (higher = applied later) */
  priority: number;
}

export class StrategyComposer {
  private strategies: Strategy[] = [];

  addStrategy(strategy: Strategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  applyStrategies(context: AIContext, actions: ScoredAction[]): ScoredAction[] {
    let result = actions;
    for (const strategy of this.strategies) {
      result = strategy.modifyScores(context, result);
    }
    return result;
  }
}

// Example strategies
export const AggressiveStrategy: Strategy = {
  id: 'aggressive',
  name: 'Aggressive',
  priority: 10,
  modifyScores(context, actions) {
    return actions.map(a => ({
      ...a,
      score: a.action.commandType === 'ATTACK' ? a.score * 1.5 : a.score,
    }));
  },
};

export const ExpansionistStrategy: Strategy = {
  id: 'expansionist',
  name: 'Expansionist',
  priority: 10,
  modifyScores(context, actions) {
    return actions.map(a => ({
      ...a,
      score: a.action.commandType === 'FOUND_CITY' ? a.score * 2 : a.score,
    }));
  },
};
```

## Automatic Action Discovery Mechanisms

### Mechanism 1: Command Type Introspection

The existing `COMMAND_TYPES` constant can be extended to support discovery:

```typescript
// Current (from types.ts)
export const COMMAND_TYPES = {
  MOVE_UNIT: 'MOVE_UNIT',
  ATTACK: 'ATTACK',
  FOUND_CITY: 'FOUND_CITY',
  SET_PRODUCTION: 'SET_PRODUCTION',
  END_TURN: 'END_TURN',
} as const;

// Enhanced: Add metadata alongside
export const COMMAND_METADATA: Record<CommandType, CommandMetadata> = {
  MOVE_UNIT: {
    categories: ['exploration', 'military'],
    basePriority: 50,
    requirements: { entityType: ['unit'], minMovement: 1 },
    outcomes: [{ type: 'position_change', impact: {} }],
  },
  ATTACK: {
    categories: ['military'],
    basePriority: 70,
    requirements: { entityType: ['unit'], minMovement: 1, capabilities: ['combat'] },
    outcomes: [
      { type: 'enemy_damaged', probability: 0.95, impact: { threatReduction: 1 } },
      { type: 'enemy_killed', probability: 0.3, impact: { unitsDelta: -1 } },
    ],
  },
  // ...
};
```

### Mechanism 2: Validator-Based Availability

Leverage existing validators to determine action availability:

```typescript
// Proposed: Check if any command of a type is possible for an entity
export function isActionAvailable(
  commandType: CommandType,
  context: AIContext,
  entityEid: number
): boolean {
  const validator = getValidator(commandType);
  const deps = buildValidatorDeps(commandType, context);

  // Generate a probe command
  const probeCommand = generateProbeCommand(commandType, context.playerId, entityEid);
  if (!probeCommand) return false;

  const result = validator(probeCommand, deps);
  return result.valid;
}
```

### Mechanism 3: Yield-Based Feature Exposure

New game features can expose their AI relevance through a standard interface:

```typescript
// Proposed: Feature AI interface
export interface AIAwareFeature {
  /** What actions does this feature enable? */
  enabledActions: CommandType[];

  /** How should AI evaluate this feature? */
  evaluationFactors: {
    factor: string;
    weight: number;
    evaluate: (context: AIContext, target: unknown) => number;
  }[];

  /** Does this feature create new entity types AI should manage? */
  managedEntityTypes?: EntityType[];
}

// Example: Future "Trade" feature
export const TradeFeature: AIAwareFeature = {
  enabledActions: ['ESTABLISH_TRADE_ROUTE', 'CANCEL_TRADE_ROUTE'],
  evaluationFactors: [
    {
      factor: 'gold_income',
      weight: 1.0,
      evaluate: (ctx, route) => calculateTradeIncome(route),
    },
    {
      factor: 'diplomatic_benefit',
      weight: 0.5,
      evaluate: (ctx, route) => calculateDiplomaticValue(ctx, route),
    },
  ],
  managedEntityTypes: ['trader'],
};
```

## Implementation Recommendations

### Phase 1: Foundation (Week 1)

1. **Create Action Registry**
   - Implement `ActionDefinition` interface
   - Implement `ActionRegistry` singleton
   - Register existing 5 command types as actions

2. **Define AI Context**
   ```typescript
   export interface AIContext {
     world: IWorld;
     playerId: number;
     gameState: GameState;
     tileMap: Map<string, GeneratedTile>;
     pathfinder: Pathfinder;
     territoryManager: TerritoryManager;

     // Cached queries
     myUnits: UnitSnapshot[];
     myCities: CitySnapshot[];
     enemyUnits: Map<number, UnitSnapshot[]>;
     enemyCities: Map<number, CitySnapshot[]>;
   }
   ```

3. **Implement Base AI Controller**
   - Query all registered actions for each entity
   - Generate candidates using action definitions
   - Score and select best action
   - Execute via existing command system

### Phase 2: Scoring Infrastructure (Week 2)

1. **Implement Scoring Modules**
   - `ExplorationScorer`: unexplored tiles, map coverage
   - `SettlementScorer`: tile yields, resources, spacing
   - `CombatScorer`: damage ratios, survival odds
   - `DefenseScorer`: threat proximity, terrain defense

2. **Create Weighted Scorer Combiner**
   ```typescript
   export class WeightedScorer {
     score(context: AIContext, command: GameCommand): number {
       let total = 0;
       for (const scorer of this.scorers) {
         total += scorer.weight * scorer.score(context, command);
       }
       return total;
     }
   }
   ```

### Phase 3: Auto-Discovery (Week 3)

1. **Add ActionCapability component to ECS**
2. **Implement capability update system**
3. **Add command metadata to COMMAND_TYPES**
4. **Create probe command generators for each type**

### Phase 4: Strategy Layer (Week 4)

1. **Implement Strategy interface**
2. **Create personality presets (Aggressive, Defensive, Expansionist, Balanced)**
3. **Add difficulty scaling via weight multipliers**
4. **Implement strategy selection based on game state**

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Command definitions - extend with metadata |
| `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts` | Validator registry - pattern to follow |
| `/Users/alex/workspace/civ/src/engine/state/queries.ts` | State queries - use for AI context |
| `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Snapshot types - capabilities already present |
| `/Users/alex/workspace/civ/src/ecs/world.ts` | ECS components - add ActionCapability |
| `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` | Movement evaluation - getReachableTiles |
| `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts` | Combat preview - calculateCombat |

## Ideal End State Architecture

```
src/ai/
  index.ts                      # Module exports

  registry/
    ActionDefinition.ts         # Self-describing action interface
    ActionRegistry.ts           # Central action registry
    CommandMetadata.ts          # Enhanced command metadata

  actions/
    index.ts                    # Auto-registers all actions
    MoveAction.ts               # Move unit action definition
    AttackAction.ts             # Attack action definition
    FoundCityAction.ts          # Found city action definition
    SetProductionAction.ts      # Set production action definition
    # New actions added here auto-register

  scoring/
    Scorer.ts                   # Scorer interface
    WeightedScorer.ts           # Combines multiple scorers
    ExplorationScorer.ts        # Exploration value scoring
    SettlementScorer.ts         # City placement scoring
    CombatScorer.ts             # Combat outcome scoring
    ThreatScorer.ts             # Threat assessment scoring

  strategy/
    Strategy.ts                 # Strategy interface
    StrategyComposer.ts         # Combines strategies
    presets/
      Aggressive.ts
      Defensive.ts
      Expansionist.ts
      Balanced.ts

  context/
    AIContext.ts                # AI decision context
    ContextBuilder.ts           # Build context from game state

  controller/
    AIController.ts             # Main AI coordinator
    AITurnProcessor.ts          # Turn integration

  discovery/
    ActionDiscovery.ts          # Auto-discover available actions
    CapabilitySystem.ts         # ECS capability tracking
```

## Adding New Features to AI

When a new game feature is added (e.g., "Research"), the process to make AI aware:

1. **Define command type** in `types.ts`:
   ```typescript
   export interface ResearchTechCommand extends Command {
     type: 'RESEARCH_TECH';
     techId: string;
   }
   ```

2. **Add validator and executor** following existing patterns

3. **Create action definition** in `src/ai/actions/ResearchAction.ts`:
   ```typescript
   export const ResearchAction = defineAction({
     id: 'RESEARCH_TECH',
     commandType: COMMAND_TYPES.RESEARCH_TECH,
     applicableTo: ['player'],  // Player-level, not unit

     generateCandidates(context) {
       return getAvailableTechs(context).map(tech => ({
         type: 'RESEARCH_TECH',
         playerId: context.playerId,
         techId: tech.id,
       }));
     },

     scoreCandidate(context, command) {
       const tech = getTechById(command.techId);
       return evaluateTechValue(context, tech);
     },
   });
   ```

4. **Import in actions/index.ts** to auto-register

The AI will automatically start considering research decisions without modifying any AI controller code.

## Open Questions

1. **City-level vs Unit-level decisions**: Should production decisions go through the same action registry, or have a separate city AI module?

2. **Multi-step planning**: Current design is greedy (best single action). Should we add lookahead planning for complex strategies?

3. **Learning/adaptation**: Should AI track what strategies work against human player and adapt over game?

4. **Performance budget**: How many actions can we evaluate per AI turn before causing noticeable delay?

5. **Randomization**: How much score randomization to prevent predictable AI? Should it vary by difficulty?

6. **Event-driven updates**: Should AI re-evaluate when significant events occur mid-turn (enemy unit spotted)?

## Conclusion

The OpenCiv codebase is well-structured for building an extensible AI system. The existing command pattern with validators and executors provides the perfect foundation. By implementing:

1. **Self-describing action registry** - Actions register themselves with generation and scoring logic
2. **Metadata-enriched commands** - Command types carry AI-relevant metadata
3. **Strategy composition** - AI personalities built by combining modular strategies
4. **Capability tracking** - ECS components for O(1) action availability checks

The AI can automatically discover and evaluate new actions as game features are added. The ideal end state requires adding new actions in one place (the action definition file), with the AI system automatically incorporating them into decision making.

Total estimated implementation: 4 weeks for full extensible system, or 1-2 weeks for minimal viable extensible AI.
