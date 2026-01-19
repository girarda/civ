# Research: AI Opponents for OpenCiv

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the OpenCiv codebase to design an AI opponent system (Stream F) for single-player gameplay. The existing unit, city, and combat systems provide a solid foundation. The AI needs a decision-making framework, exploration behavior, city placement intelligence, and combat tactics. A utility-based AI approach is recommended over behavior trees due to flexibility and the 4X genre's complex state evaluation needs.

## Key Discoveries

- **Player system distinguishes human vs AI**: `PlayerManager` already tracks `isHuman` flag for each player
- **AI players exist but have no behavior**: Two players are initialized (player 0 = human, player 1 = AI) but AI units stand idle
- **Turn system has no AI turn hook**: `TurnSystem.processTurnEnd()` processes cities but doesn't invoke AI decisions
- **All required queries exist**: `getUnitsForPlayer()`, `getCitiesForPlayer()`, pathfinder, combat calculations
- **Command pattern exists**: `GameCommand` types (MOVE_UNIT, ATTACK, FOUND_CITY) can be reused for AI actions
- **Pathfinder already supports exploration**: `getReachableTiles()` returns all tiles within movement range
- **Tile yields exist for city evaluation**: `calculateYields()` provides food/production/gold for settlement scoring
- **Combat preview exists**: `calculateCombat()` can be used to evaluate attack outcomes before committing

## Dependencies Status

| Dependency | Status | Notes |
|------------|--------|-------|
| Stream A: Units | Complete | UnitType, Movement, Selection, Pathfinding all implemented |
| Stream B: Cities | Complete | City founding, territory, production queue, yields |
| Stream C: Turns | Complete | TurnSystem with hooks, GameState with phases |
| Stream D: Combat | Complete | CombatCalculator, CombatExecutor, combat preview |
| Stream E: Production | Complete | ProductionQueue, CityProcessor with production/growth |

All dependencies for Stream F are satisfied. AI implementation can begin immediately.

## Current Architecture Analysis

### Game Loop Structure

The game follows this flow per turn:

```
Human Player Turn:
  TurnStart -> Reset movement points
  PlayerAction -> Human clicks units, moves, attacks, ends turn
  TurnEnd -> Process production, check victory

AI Turn (NOT IMPLEMENTED):
  Currently missing - AI units never act
```

### Existing Integration Points

**1. PlayerManager (`/Users/alex/workspace/civ/src/player/PlayerManager.ts`)**
```typescript
getAIPlayers(): PlayerSnapshot[] {
  return this.getAllPlayers().filter((p) => !p.isHuman);
}
```

**2. Unit Queries (`/Users/alex/workspace/civ/src/ecs/unitSystems.ts`)**
```typescript
getUnitsForPlayer(world, playerId): number[]  // Get all AI units
getUnitPosition(eid): { q, r }                 // Where is unit?
getUnitMovement(eid): { current, max }         // Can it move?
canUnitMove(eid): boolean                      // Has movement points?
```

**3. Pathfinding (`/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts`)**
```typescript
getReachableTiles(start, movement): Map<string, number>  // Exploration targets
findPath(start, end, maxMovement): PathResult            // Movement planning
isPassable(position): boolean                            // Valid destinations
```

**4. Combat (`/Users/alex/workspace/civ/src/combat/`)**
```typescript
calculateCombat(context): CombatResult           // Evaluate attack outcomes
CombatExecutor.canAttack(attacker, target): boolean
CombatExecutor.executeAttack(attacker, target): CombatResult
```

**5. City Founding (`/Users/alex/workspace/civ/src/city/CityFounder.ts`)**
```typescript
canFoundCity(world, settler, tileMap): boolean
tryFoundCity(world, settler, tileMap, territoryManager, callback): result
```

**6. Tile Yields (`/Users/alex/workspace/civ/src/tile/TileYields.ts`)**
```typescript
calculateYields(terrain, feature, resource): TileYields
totalYields(yields): number  // Sum all yield types
```

## AI Architecture Recommendations

### Approach: Utility-Based AI

For 4X games, **Utility AI** is preferred over Behavior Trees because:

1. **Complex State Evaluation**: 4X games require weighing many factors simultaneously (expansion, defense, economy)
2. **Flexible Priorities**: Utility scores allow natural priority shifting without rigid tree restructuring
3. **Emergent Behavior**: Combining utility functions creates varied, believable AI behavior
4. **Easy Tuning**: Score weights can be adjusted without logic changes

**Comparison:**

| Approach | Pros | Cons |
|----------|------|------|
| Behavior Trees | Clear logic flow, debuggable | Rigid, requires many conditions for 4X complexity |
| Decision Trees | Simple to implement | Doesn't handle continuous tradeoffs well |
| Utility AI | Flexible, emergent, tunable | More complex to debug, requires careful scoring |
| GOAP | Optimal plans | Computationally expensive, overkill for MVP |

### Recommended Architecture

```
src/ai/
  index.ts                    - Module exports
  AIController.ts             - Main AI coordinator
  decisions/
    DecisionContext.ts        - Game state context for AI
    ActionEvaluator.ts        - Base utility scoring
    ExploreAction.ts          - Exploration scoring/execution
    SettleAction.ts           - City placement scoring/execution
    AttackAction.ts           - Combat scoring/execution
    DefendAction.ts           - Defensive positioning
  evaluation/
    TileEvaluator.ts          - Score tiles for settlement
    ThreatEvaluator.ts        - Assess military threats
    ExpansionEvaluator.ts     - Expansion opportunities
  AITurnProcessor.ts          - Process AI turn, execute decisions
```

### Decision Flow

```
AI Turn:
  1. Gather Context
     - My units, cities, territory
     - Enemy units, cities, positions
     - Map state, unexplored tiles

  2. For Each AI Unit:
     a. Generate Candidate Actions
        - Move toward unexplored tile (explore)
        - Move toward good settlement spot (if Settler)
        - Found city (if Settler on good tile)
        - Attack adjacent enemy (if combat unit)
        - Move toward enemy (aggressive)
        - Move away from threat (defensive)

     b. Score Each Action
        - Exploration: value = unexplored_tiles_revealed * explore_weight
        - Settlement: value = tile_yields_sum * settle_weight
        - Attack: value = expected_damage_ratio * aggression_weight
        - Defense: value = survival_probability * defense_weight

     c. Execute Highest-Scored Action

  3. Process All Units Until No Actions Remain
```

## F1: AI Decision Framework

### Implementation Approach

**Core Interface:**

```typescript
// src/ai/decisions/ActionEvaluator.ts
export interface AIAction {
  type: 'EXPLORE' | 'SETTLE' | 'ATTACK' | 'MOVE_TO' | 'DEFEND' | 'SKIP';
  unitEid: number;
  score: number;           // Utility score (higher = preferred)
  targetPosition?: TilePosition;
  targetEid?: number;      // For attacks
}

export interface DecisionContext {
  world: IWorld;
  playerId: number;
  tileMap: Map<string, GeneratedTile>;
  pathfinder: Pathfinder;
  territoryManager: TerritoryManager;
  gameState: GameState;

  // Cached queries
  myUnits: number[];
  myCities: number[];
  enemyUnits: Map<number, number[]>;  // playerId -> unit eids
  enemyCities: Map<number, number[]>;
  exploredTiles: Set<string>;
}

export interface ActionGenerator {
  generateActions(context: DecisionContext, unitEid: number): AIAction[];
}
```

**AI Controller:**

```typescript
// src/ai/AIController.ts
export class AIController {
  private generators: ActionGenerator[];

  constructor(
    private world: IWorld,
    private tileMap: Map<string, GeneratedTile>,
    private pathfinder: Pathfinder,
    private territoryManager: TerritoryManager,
    private movementExecutor: MovementExecutor,
    private combatExecutor: CombatExecutor
  ) {
    this.generators = [
      new ExploreActionGenerator(),
      new SettleActionGenerator(),
      new AttackActionGenerator(),
      new DefendActionGenerator(),
    ];
  }

  processTurn(playerId: number, gameState: GameState): void {
    const context = this.buildContext(playerId, gameState);

    // Process each unit
    for (const unitEid of context.myUnits) {
      this.processUnit(context, unitEid);
    }
  }

  private processUnit(context: DecisionContext, unitEid: number): void {
    // Generate all possible actions
    const actions: AIAction[] = [];
    for (const generator of this.generators) {
      actions.push(...generator.generateActions(context, unitEid));
    }

    // Sort by score and execute best
    actions.sort((a, b) => b.score - a.score);

    if (actions.length > 0 && actions[0].score > 0) {
      this.executeAction(actions[0]);
    }
  }

  private executeAction(action: AIAction): void {
    switch (action.type) {
      case 'EXPLORE':
      case 'MOVE_TO':
        this.movementExecutor.executeMove(action.unitEid, action.targetPosition!);
        break;
      case 'ATTACK':
        this.combatExecutor.executeAttack(action.unitEid, action.targetPosition!);
        break;
      case 'SETTLE':
        // Use canFoundCity/tryFoundCity
        break;
      case 'SKIP':
        // Do nothing
        break;
    }
  }
}
```

### Utility Scoring Weights

```typescript
// src/ai/AIConfig.ts
export const AI_WEIGHTS = {
  exploration: {
    newTileValue: 10,        // Per unexplored tile revealed
    distancePenalty: -1,     // Per tile of distance
  },
  settlement: {
    foodWeight: 3,           // Food is critical for growth
    productionWeight: 2,     // Production for units/buildings
    goldWeight: 1,           // Gold less important early
    resourceBonus: 5,        // Bonus for luxury/strategic resources
    coastBonus: 3,           // Coastal cities valuable
    defensibilityWeight: 2,  // Hills/rivers nearby
    distanceFromOtherCities: 4, // Prefer spacing
  },
  combat: {
    attackThreshold: 0.6,    // Min expected damage ratio to attack
    defenseValueMultiplier: 1.5,  // Weigh defensive positions higher
    lowHealthRetreatThreshold: 30, // HP below which to retreat
  },
  aggression: 0.7,           // 0 = defensive, 1 = aggressive
};
```

## F2: Exploration AI

### Strategy

Exploration AI should:
1. Move Scout units toward fog of war
2. Prioritize revealing large unexplored areas
3. Avoid dangerous terrain (near enemies early game)
4. Circle around the map systematically

### Implementation

```typescript
// src/ai/decisions/ExploreAction.ts
export class ExploreActionGenerator implements ActionGenerator {
  generateActions(context: DecisionContext, unitEid: number): AIAction[] {
    const actions: AIAction[] = [];
    const unitPos = getUnitPosition(unitEid);
    const movement = MovementComponent.current[unitEid];

    if (movement <= 0) return actions;

    // Get reachable tiles
    const reachable = context.pathfinder.getReachableTiles(
      new TilePosition(unitPos.q, unitPos.r),
      movement
    );

    // Score each reachable tile by unexplored neighbors
    for (const [key, cost] of reachable) {
      const pos = TilePosition.fromKey(key);
      const unexploredNeighbors = this.countUnexploredNeighbors(
        pos,
        context.exploredTiles,
        context.tileMap
      );

      if (unexploredNeighbors > 0) {
        const score = unexploredNeighbors * AI_WEIGHTS.exploration.newTileValue
                    + cost * AI_WEIGHTS.exploration.distancePenalty;

        actions.push({
          type: 'EXPLORE',
          unitEid,
          targetPosition: pos,
          score,
        });
      }
    }

    return actions;
  }

  private countUnexploredNeighbors(
    pos: TilePosition,
    explored: Set<string>,
    tileMap: Map<string, GeneratedTile>
  ): number {
    let count = 0;
    // Check tiles within sight range (2 for most units)
    for (const tile of pos.range(2)) {
      const key = tile.key();
      if (!explored.has(key) && tileMap.has(key)) {
        count++;
      }
    }
    return count;
  }
}
```

### Fog of War Note

The current codebase does NOT have fog of war implemented. For MVP AI exploration:
- Track "AI-explored" tiles in a Set
- Initially only the starting area is explored
- Tiles become explored when AI units visit adjacent tiles

Future enhancement: Proper fog of war system visible to human player.

## F3: City Placement AI

### Evaluation Criteria

Good city locations maximize:
1. **Total Yields**: Sum of food + production + gold from territory tiles
2. **Fresh Water**: Tiles adjacent to rivers/lakes
3. **Resources**: Strategic and luxury resources within range
4. **Defensibility**: Hills, rivers, chokepoints nearby
5. **Spacing**: Not too close to existing cities (typically 4+ tiles apart)
6. **Coast Access**: Naval opportunities (future)

### Implementation

```typescript
// src/ai/evaluation/TileEvaluator.ts
export function evaluateSettlementLocation(
  pos: TilePosition,
  context: DecisionContext
): number {
  // Cannot settle on water, mountains
  const centerTile = context.tileMap.get(pos.key());
  if (!centerTile || !isPassable(centerTile.terrain)) {
    return -Infinity;
  }

  // Cannot settle too close to existing cities
  for (const cityEid of [...context.myCities, ...flatMapCities(context.enemyCities)]) {
    const cityPos = new TilePosition(Position.q[cityEid], Position.r[cityEid]);
    if (pos.distanceTo(cityPos) < 4) {
      return -Infinity;  // Too close
    }
  }

  // Calculate territory yields
  const territory = pos.range(INITIAL_TERRITORY_RADIUS);
  let totalYields = 0;
  let resourceCount = 0;
  let hillCount = 0;
  let coastTiles = 0;

  for (const tile of territory) {
    const tileData = context.tileMap.get(tile.key());
    if (!tileData) continue;

    const yields = calculateYields(tileData.terrain, tileData.feature, tileData.resource);
    totalYields += yields.food * AI_WEIGHTS.settlement.foodWeight
                 + yields.production * AI_WEIGHTS.settlement.productionWeight
                 + yields.gold * AI_WEIGHTS.settlement.goldWeight;

    if (tileData.resource) resourceCount++;
    if (TERRAIN_DATA[tileData.terrain].isHill) hillCount++;
    if (tileData.terrain === Terrain.Coast) coastTiles++;
  }

  // Apply bonuses
  let score = totalYields;
  score += resourceCount * AI_WEIGHTS.settlement.resourceBonus;
  score += hillCount * AI_WEIGHTS.settlement.defensibilityWeight;
  score += (coastTiles > 0 ? AI_WEIGHTS.settlement.coastBonus : 0);

  return score;
}

// src/ai/decisions/SettleAction.ts
export class SettleActionGenerator implements ActionGenerator {
  generateActions(context: DecisionContext, unitEid: number): AIAction[] {
    // Only Settlers can settle
    if (UnitComponent.type[unitEid] !== UnitType.Settler) {
      return [];
    }

    const actions: AIAction[] = [];
    const unitPos = getUnitPosition(unitEid);
    const currentPos = new TilePosition(unitPos.q, unitPos.r);

    // Option 1: Settle here
    if (canFoundCity(context.world, unitEid, context.tileMap)) {
      const score = evaluateSettlementLocation(currentPos, context);
      actions.push({
        type: 'SETTLE',
        unitEid,
        targetPosition: currentPos,
        score: score * 1.2,  // Bonus for settling now vs moving
      });
    }

    // Option 2: Move toward better locations
    const reachable = context.pathfinder.getReachableTiles(
      currentPos,
      MovementComponent.current[unitEid]
    );

    for (const [key] of reachable) {
      const pos = TilePosition.fromKey(key);
      const score = evaluateSettlementLocation(pos, context);

      if (score > 0) {
        actions.push({
          type: 'MOVE_TO',
          unitEid,
          targetPosition: pos,
          score,
        });
      }
    }

    return actions;
  }
}
```

### Settlement Scoring Example

| Factor | Weight | Example Tiles | Score |
|--------|--------|---------------|-------|
| Grassland (food 2) | 3 | 4 tiles | 24 |
| Plains (food 1, prod 1) | 3+2 | 2 tiles | 10 |
| Hill (prod 2) | 2 | 1 tile | 4 |
| Resource | 5 | 1 wheat | 5 |
| Coast bonus | 3 | Yes | 3 |
| **Total** | | | **46** |

## F4: Combat AI

### Strategy

Combat AI should:
1. Attack when odds are favorable (expected damage ratio > threshold)
2. Focus fire weak/damaged enemies
3. Protect Settlers and cities
4. Retreat when badly damaged
5. Use terrain for defense

### Implementation

```typescript
// src/ai/decisions/AttackAction.ts
export class AttackActionGenerator implements ActionGenerator {
  generateActions(context: DecisionContext, unitEid: number): AIAction[] {
    const actions: AIAction[] = [];
    const unitType = UnitComponent.type[unitEid] as UnitType;
    const unitData = UNIT_TYPE_DATA[unitType];

    // Non-combat units (Settlers) don't attack
    if (unitData.strength <= 0) {
      return actions;
    }

    const unitPos = new TilePosition(
      Position.q[unitEid],
      Position.r[unitEid]
    );
    const unitHealth = HealthComponent.current[unitEid];

    // Check adjacent tiles for enemies
    for (const neighbor of unitPos.neighbors()) {
      const enemyEid = getUnitAtPosition(context.world, neighbor.q, neighbor.r);
      if (enemyEid === null) continue;

      const enemyOwner = OwnerComponent.playerId[enemyEid];
      if (enemyOwner === context.playerId) continue;  // Not an enemy

      // Evaluate attack
      const combatResult = this.evaluateAttack(
        unitEid,
        enemyEid,
        neighbor,
        context
      );

      if (combatResult.score > 0) {
        actions.push({
          type: 'ATTACK',
          unitEid,
          targetEid: enemyEid,
          targetPosition: neighbor,
          score: combatResult.score,
        });
      }
    }

    return actions;
  }

  private evaluateAttack(
    attackerEid: number,
    defenderEid: number,
    defenderPos: TilePosition,
    context: DecisionContext
  ): { score: number } {
    const attackerType = UnitComponent.type[attackerEid] as UnitType;
    const defenderType = UnitComponent.type[defenderEid] as UnitType;
    const attackerData = UNIT_TYPE_DATA[attackerType];
    const defenderData = UNIT_TYPE_DATA[defenderType];

    const attackerHealth = HealthComponent.current[attackerEid];
    const defenderHealth = HealthComponent.current[defenderEid];

    // Get terrain modifier
    const tile = context.tileMap.get(defenderPos.key());
    const defenseModifier = tile ? getTotalDefenseModifier(tile) : 0;

    // Calculate expected outcome
    const result = calculateCombat({
      attackerStrength: attackerData.strength,
      defenderStrength: defenderData.strength,
      attackerHealth,
      defenderHealth,
      defenseModifier,
    });

    // Score based on damage ratio and survival
    let score = 0;

    // Value killing enemies highly
    if (!result.defenderSurvives) {
      score += 100;
    } else {
      score += result.defenderDamage;
    }

    // Penalize taking damage
    score -= result.attackerDamage * 0.5;

    // Heavily penalize dying
    if (!result.attackerSurvives) {
      score -= 150;
    }

    // Don't attack if badly damaged (retreat instead)
    if (attackerHealth < AI_WEIGHTS.combat.lowHealthRetreatThreshold) {
      score -= 50;
    }

    // Only attack if score exceeds threshold
    const damageRatio = result.defenderDamage / (result.attackerDamage + 1);
    if (damageRatio < AI_WEIGHTS.combat.attackThreshold) {
      score = 0;  // Don't attack unfavorable odds
    }

    return { score };
  }
}

// src/ai/decisions/DefendAction.ts
export class DefendActionGenerator implements ActionGenerator {
  generateActions(context: DecisionContext, unitEid: number): AIAction[] {
    const actions: AIAction[] = [];
    const unitHealth = HealthComponent.current[unitEid];
    const unitPos = new TilePosition(Position.q[unitEid], Position.r[unitEid]);

    // Check if threats nearby
    const nearbyEnemies = this.countNearbyEnemies(unitPos, context);
    if (nearbyEnemies === 0) return actions;

    // If low health, prioritize moving to safety
    if (unitHealth < AI_WEIGHTS.combat.lowHealthRetreatThreshold) {
      const safeTile = this.findSafestRetreat(unitPos, context);
      if (safeTile) {
        actions.push({
          type: 'DEFEND',
          unitEid,
          targetPosition: safeTile,
          score: 80,  // High priority when damaged
        });
      }
    }

    // Move to defensive terrain (hills, forests)
    const defensivePos = this.findDefensivePosition(unitPos, context);
    if (defensivePos && !defensivePos.equals(unitPos)) {
      actions.push({
        type: 'MOVE_TO',
        unitEid,
        targetPosition: defensivePos,
        score: 30,
      });
    }

    return actions;
  }

  private findDefensivePosition(
    from: TilePosition,
    context: DecisionContext
  ): TilePosition | null {
    const reachable = context.pathfinder.getReachableTiles(
      from,
      MovementComponent.current[/* needs unit eid */]
    );

    let bestPos = from;
    let bestDefense = getTotalDefenseModifier(context.tileMap.get(from.key())!);

    for (const [key] of reachable) {
      const pos = TilePosition.fromKey(key);
      const tile = context.tileMap.get(key);
      if (!tile) continue;

      const defense = getTotalDefenseModifier(tile);
      if (defense > bestDefense) {
        bestDefense = defense;
        bestPos = pos;
      }
    }

    return bestPos;
  }
}
```

## Integration with Turn System

### AI Turn Processing

```typescript
// src/ai/AITurnProcessor.ts
export class AITurnProcessor {
  constructor(
    private aiController: AIController,
    private playerManager: PlayerManager,
    private gameState: GameState
  ) {}

  processAITurns(): void {
    const aiPlayers = this.playerManager.getAIPlayers();

    for (const player of aiPlayers) {
      if (player.isEliminated) continue;

      console.log(`Processing AI turn for player ${player.id}`);
      this.aiController.processTurn(player.id, this.gameState);
    }
  }
}

// Integrate in main.ts TurnSystem hooks:
const turnSystem = new TurnSystem(gameState, {
  onTurnStart: () => {
    movementExecutor.resetAllMovementPoints();
    // ... existing code
  },
  onTurnEnd: () => {
    cityProcessor.processTurnEnd();
    aiTurnProcessor.processAITurns();  // NEW: AI takes actions
    // ... existing code
  },
});
```

### Turn Flow with AI

```
Human Turn:
  TurnStart -> Reset movement
  PlayerAction -> Human input
  [Click End Turn]
  TurnEnd -> Process production, AI turns, check victory
```

This keeps AI turn processing invisible within the human's turn end, providing instant response. For slower AI with visible moves, consider processing AI during the next TurnStart with delays.

## Key Files to Create

| Path | Purpose |
|------|---------|
| `src/ai/index.ts` | Module exports |
| `src/ai/AIController.ts` | Main AI coordinator |
| `src/ai/AITurnProcessor.ts` | Turn integration |
| `src/ai/AIConfig.ts` | Tunable weights and thresholds |
| `src/ai/decisions/ActionEvaluator.ts` | Core interfaces |
| `src/ai/decisions/ExploreAction.ts` | Exploration logic |
| `src/ai/decisions/SettleAction.ts` | City placement logic |
| `src/ai/decisions/AttackAction.ts` | Combat decisions |
| `src/ai/decisions/DefendAction.ts` | Defensive positioning |
| `src/ai/evaluation/TileEvaluator.ts` | Settlement scoring |
| `src/ai/evaluation/ThreatEvaluator.ts` | Threat assessment |

## Implementation Order

### Phase 1: Foundation (F1 - 2 hours)
1. Create `AIConfig.ts` with tunable weights
2. Create `DecisionContext.ts` interface
3. Create `ActionEvaluator.ts` base interface
4. Create `AIController.ts` with unit iteration logic
5. Create `AITurnProcessor.ts` and integrate with `TurnSystem`

### Phase 2: Exploration (F2 - 1.5 hours)
1. Create `ExploreAction.ts` generator
2. Implement explored tiles tracking (simple Set for now)
3. Score tiles by unexplored neighbor count
4. Test with Scout units moving toward edges

### Phase 3: City Placement (F3 - 2 hours)
1. Create `TileEvaluator.ts` with settlement scoring
2. Create `SettleAction.ts` generator
3. Integrate with existing `canFoundCity`/`tryFoundCity`
4. Test with AI Settler finding and settling good locations

### Phase 4: Combat (F4 - 2 hours)
1. Create `AttackAction.ts` generator
2. Create `DefendAction.ts` generator
3. Integrate with existing `CombatExecutor`
4. Test AI attacking player units and retreating when damaged

### Phase 5: Polish (1.5 hours)
1. Add logging/debugging for AI decisions
2. Tune weights based on playtesting
3. Add unit tests for scoring functions
4. Handle edge cases (no valid moves, etc.)

**Total estimated time: 9 hours**

## Testing Strategy

### Unit Tests

1. **Exploration scoring**:
   - Tiles with more unexplored neighbors score higher
   - Distance penalty reduces score appropriately

2. **Settlement scoring**:
   - High-yield tiles score higher
   - Resources add bonus
   - Too close to cities returns -Infinity

3. **Combat scoring**:
   - Favorable odds produce positive scores
   - Unfavorable odds produce zero/negative scores
   - Low health units prefer retreat

### Integration Tests

1. **AI turn processing**:
   - AI units make moves after turn end
   - AI settlers found cities
   - AI warriors attack enemies

2. **Multi-turn scenarios**:
   - AI expands territory over turns
   - AI responds to player attacks

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI too weak/easy | High | Medium | Start with aggressive settings, tune down |
| AI too slow (performance) | Low | High | Process units iteratively, limit pathfinding depth |
| AI stuck (no valid actions) | Medium | Medium | Add "SKIP" action as fallback |
| AI exploitable patterns | High | Low | Add randomness to action selection |
| Debugging AI decisions hard | High | Medium | Add extensive logging, decision dumps |

## Open Questions

1. **Should AI have fog of war?** For fairness, AI should only "see" tiles it has explored. But MVP can use full map visibility.

2. **AI turn visibility to player?** Should AI moves be animated/visible, or instant? Instant is simpler; animation needs delay system.

3. **Multiple AI personalities?** Different weight profiles (aggressive, defensive, expansionist) add variety but complexity.

4. **AI difficulty levels?** Easy/Normal/Hard could scale weights or add handicaps. Defer to post-MVP.

5. **AI city production priority?** AI needs to decide what to produce. Start with simple: always produce Warriors until have 3, then Settlers.

6. **AI diplomacy?** Not in scope for MVP. All players are at war always.

## Recommendations

1. **Start Simple**: Implement F1 foundation first, then add behaviors incrementally. A simple AI that moves units is better than no AI.

2. **Tune Iteratively**: Initial weight values will be wrong. Plan for multiple tuning passes during playtesting.

3. **Add Randomness**: Slightly randomize scores (e.g., +/- 10%) to prevent predictable AI patterns.

4. **Visualize Decisions**: During development, add debug mode that shows AI decision scores for each unit.

5. **Defer Complexity**: Skip advanced features like fog of war, personality types, and difficulty levels for MVP. Add after basic AI works.

6. **Log Everything**: AI debugging is hard. Log every decision with scores for post-mortem analysis.

## Conclusion

The OpenCiv codebase is well-prepared for AI implementation. All required dependencies (units, cities, combat, pathfinding) are complete. The recommended utility-based AI approach fits the 4X genre well and integrates cleanly with existing systems.

The AI system can be implemented incrementally:
1. **F1**: Decision framework enabling unit-level decision making
2. **F2**: Exploration sending scouts into fog of war
3. **F3**: City placement finding optimal settlement locations
4. **F4**: Combat attacking weak enemies, defending when threatened

Total implementation estimate: ~9 hours for basic functional AI opponent. Post-MVP enhancements (fog of war, difficulty, personalities) can follow.
