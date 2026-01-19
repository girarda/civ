# Research: Combat System Implementation

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the existing OpenCiv codebase to understand how a combat system should be implemented. The unit system foundation (A1, A2) is already complete with unit types, stats, rendering, selection, and movement. The terrain system provides data that can be used for combat modifiers. The combat system (Stream D) can now be implemented following the established ECS patterns and reactive state management architecture.

## Key Discoveries

- Unit data model already includes `strength` (8 for Warrior, 5 for Scout, 0 for Settler) and `rangedStrength` + `range` fields
- Units have health tracking planned but no `HealthComponent` exists in ECS yet
- Terrain has `isHill` property which traditionally provides +25% defense bonus in Civ games
- Features like Forest and Jungle add movement cost but could also provide combat modifiers
- Rivers on tile edges provide natural defensive positions in Civ games
- The codebase uses reactive state management pattern (subscribe/notify) for UI updates
- bitECS is used for ECS components with typed arrays for performance
- `getUnitAtPosition()` already exists for finding enemy units on tiles

## Architecture Overview

### Current Unit System

The unit system is implemented across several files:

```
src/unit/
  UnitType.ts          - Unit type enum and static data (movement, strength, cost)
  MovementSystem.ts    - Movement execution with pathfinding integration
  index.ts             - Module exports

src/ecs/
  world.ts             - ECS components: UnitComponent, MovementComponent, OwnerComponent
  unitSystems.ts       - Query utilities: getUnitAtPosition, getUnitsForPlayer

src/render/
  UnitRenderer.ts      - Visual rendering of units as colored circles
  SelectionHighlight.ts - Selected unit highlight
  MovementPreview.ts   - Reachable tiles overlay

src/ui/
  SelectionState.ts    - Reactive state for unit selection
  SelectionSystem.ts   - Click handling for unit selection
```

### ECS Component Pattern

Components are defined using `bitECS.defineComponent` with typed arrays:

```typescript
// Example from world.ts
export const UnitComponent = defineComponent({
  type: Types.ui8,  // UnitType enum value
});

export const MovementComponent = defineComponent({
  current: Types.ui8,  // Remaining movement points
  max: Types.ui8,      // Maximum movement points
});
```

### Reactive State Pattern

State management uses a subscriber pattern:

```typescript
// Example from SelectionState.ts
class SelectionState {
  private listeners: SelectionListener[] = [];

  subscribe(listener: SelectionListener): () => void {
    this.listeners.push(listener);
    return () => { /* unsubscribe */ };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.selectedUnit);
    }
  }
}
```

## Patterns Found

### 1. Unit Stats Data Pattern

Unit static data is stored in a lookup table:

```typescript
// From UnitType.ts
export interface UnitTypeData {
  name: string;
  movement: number;
  strength: number;         // Combat strength (8 for Warrior)
  rangedStrength: number;   // 0 for melee units
  range: number;            // 0 for melee units
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
  // ...
};
```

### 2. Terrain Modifier Data

Terrain already tracks combat-relevant properties:

```typescript
// From Terrain.ts
export interface TerrainData {
  food: number;
  production: number;
  gold: number;
  movementCost: number;
  isWater: boolean;
  isHill: boolean;        // Hills provide defense bonus
  isPassable: boolean;
}
```

### 3. Feature Modifier Pattern

Features modify terrain but currently only for yields/movement:

```typescript
// From TileFeature.ts
export interface FeatureData {
  foodModifier: number;
  productionModifier: number;
  goldModifier: number;
  movementModifier: number;
  validTerrains: Terrain[];
  // Could add: defenseModifier: number;
}
```

### 4. Entity Query Pattern

Units can be queried by position:

```typescript
// From unitSystems.ts
export function getUnitAtPosition(world: IWorld, q: number, r: number): number | null {
  const units = unitQuery(world);
  for (const eid of units) {
    if (Position.q[eid] === q && Position.r[eid] === r) {
      return eid;
    }
  }
  return null;
}
```

## Terrain Modifiers for Combat

Based on Civilization series conventions:

### Defense Bonuses (Defender's Tile)

| Terrain/Feature | Defense Bonus |
|----------------|---------------|
| Hills | +25% |
| Forest | +25% |
| Jungle | +25% |
| Across River | +25% (attacker penalty) |
| Fortified | +25% (requires action) |

### Attack Penalties (Context)

| Condition | Attack Penalty |
|-----------|---------------|
| Attacking across river | -25% |
| Low health | Proportional to missing health |

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/unit/UnitType.ts` | Unit type definitions with `strength`, `rangedStrength`, `range` |
| `/Users/alex/workspace/civ/src/ecs/world.ts` | ECS components (need to add HealthComponent) |
| `/Users/alex/workspace/civ/src/ecs/unitSystems.ts` | Unit queries including `getUnitAtPosition` |
| `/Users/alex/workspace/civ/src/tile/Terrain.ts` | Terrain data with `isHill` for defense bonus |
| `/Users/alex/workspace/civ/src/tile/TileFeature.ts` | Features that could provide defense modifiers |
| `/Users/alex/workspace/civ/src/ui/SelectionState.ts` | Pattern for reactive combat state |
| `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` | Could be extended for attack range checking |

## Proposed Combat System Design

### D1: Combat Stats Component

Add a new ECS component for health tracking:

```typescript
// Add to src/ecs/world.ts
export const HealthComponent = defineComponent({
  current: Types.ui8,  // Current health (0-100)
  max: Types.ui8,      // Maximum health (100)
});

// Modify createUnitEntity to include HealthComponent
export function createUnitEntity(
  world: IWorld,
  q: number,
  r: number,
  unitType: number,
  playerId: number,
  maxMovement: number,
  maxHealth: number = 100  // Add health parameter
): number {
  // ... existing code ...
  addComponent(world, HealthComponent, eid);
  HealthComponent.current[eid] = maxHealth;
  HealthComponent.max[eid] = maxHealth;
  return eid;
}
```

### D2: Combat Calculation

Create a new file `src/combat/CombatCalculator.ts`:

```typescript
export interface CombatResult {
  attackerDamage: number;     // Damage dealt to attacker
  defenderDamage: number;     // Damage dealt to defender
  attackerDies: boolean;
  defenderDies: boolean;
}

export interface CombatModifiers {
  terrain: number;    // e.g., 0.25 for hills
  feature: number;    // e.g., 0.25 for forest
  river: number;      // e.g., 0.25 for river crossing
  health: number;     // Reduction based on missing health
}

/**
 * Calculate combat outcome using simplified Civ-style formula.
 *
 * Formula inspired by Civ 5:
 * - Base damage = 30 * (attacker_strength / defender_strength)
 * - Modified by terrain, features, river crossing
 * - Attacker also takes damage (reduced)
 */
export function calculateCombat(
  attackerStrength: number,
  defenderStrength: number,
  attackerHealth: number,
  defenderHealth: number,
  defenderModifiers: CombatModifiers
): CombatResult {
  // Apply defender bonuses
  const totalDefenseBonus = 1 + defenderModifiers.terrain +
                            defenderModifiers.feature +
                            defenderModifiers.river;
  const effectiveDefenderStrength = defenderStrength * totalDefenseBonus;

  // Health modifier (units fight at reduced strength when damaged)
  const attackerHealthRatio = attackerHealth / 100;
  const defenderHealthRatio = defenderHealth / 100;

  const effectiveAttackerStrength = attackerStrength * attackerHealthRatio;
  const finalDefenderStrength = effectiveDefenderStrength * defenderHealthRatio;

  // Calculate strength ratio
  const ratio = effectiveAttackerStrength / finalDefenderStrength;

  // Base damage formula
  const baseDamage = 30;
  const defenderDamage = Math.round(baseDamage * ratio);
  const attackerDamage = Math.round(baseDamage / ratio * 0.5);  // Attacker takes less

  // Cap damage at current health
  const actualDefenderDamage = Math.min(defenderDamage, defenderHealth);
  const actualAttackerDamage = Math.min(attackerDamage, attackerHealth);

  return {
    attackerDamage: actualAttackerDamage,
    defenderDamage: actualDefenderDamage,
    attackerDies: attackerHealth - actualAttackerDamage <= 0,
    defenderDies: defenderHealth - actualDefenderDamage <= 0,
  };
}
```

### D3: Combat Execution

Create `src/combat/CombatSystem.ts`:

```typescript
export class CombatExecutor {
  private world: IWorld;
  private tileMap: Map<string, GeneratedTile>;
  private unitRenderer: UnitRenderer;

  constructor(world: IWorld, tileMap: Map<string, GeneratedTile>, unitRenderer: UnitRenderer) {
    this.world = world;
    this.tileMap = tileMap;
    this.unitRenderer = unitRenderer;
  }

  /**
   * Check if attacker can attack the target position.
   * - Target must have an enemy unit
   * - Attacker must be adjacent (for melee)
   * - Attacker must have movement points
   */
  canAttack(attackerEid: number, targetPos: TilePosition): boolean {
    // Check attacker has movement
    if (MovementComponent.current[attackerEid] <= 0) return false;

    // Check attacker is adjacent to target (melee)
    const attackerPos = new TilePosition(Position.q[attackerEid], Position.r[attackerEid]);
    if (attackerPos.distanceTo(targetPos) !== 1) return false;

    // Check target has an enemy unit
    const defenderEid = getUnitAtPosition(this.world, targetPos.q, targetPos.r);
    if (defenderEid === null) return false;

    // Check it's an enemy (different owner)
    if (OwnerComponent.playerId[attackerEid] === OwnerComponent.playerId[defenderEid]) {
      return false;
    }

    return true;
  }

  /**
   * Execute an attack.
   */
  executeAttack(attackerEid: number, targetPos: TilePosition): CombatResult | null {
    if (!this.canAttack(attackerEid, targetPos)) return null;

    const defenderEid = getUnitAtPosition(this.world, targetPos.q, targetPos.r)!;

    // Get unit stats
    const attackerType = UnitComponent.type[attackerEid];
    const defenderType = UnitComponent.type[defenderEid];
    const attackerData = UNIT_TYPE_DATA[attackerType];
    const defenderData = UNIT_TYPE_DATA[defenderType];

    // Get health
    const attackerHealth = HealthComponent.current[attackerEid];
    const defenderHealth = HealthComponent.current[defenderEid];

    // Calculate terrain modifiers for defender
    const modifiers = this.getDefenderModifiers(targetPos);

    // Calculate combat result
    const result = calculateCombat(
      attackerData.strength,
      defenderData.strength,
      attackerHealth,
      defenderHealth,
      modifiers
    );

    // Apply damage
    HealthComponent.current[attackerEid] = attackerHealth - result.attackerDamage;
    HealthComponent.current[defenderEid] = defenderHealth - result.defenderDamage;

    // Consume all movement points (attacking ends turn for unit)
    MovementComponent.current[attackerEid] = 0;

    // Remove dead units
    if (result.defenderDies) {
      this.removeUnit(defenderEid);
    }
    if (result.attackerDies) {
      this.removeUnit(attackerEid);
    }

    return result;
  }

  private getDefenderModifiers(pos: TilePosition): CombatModifiers {
    const tile = this.tileMap.get(pos.key());
    const modifiers: CombatModifiers = {
      terrain: 0,
      feature: 0,
      river: 0,
      health: 0,
    };

    if (!tile) return modifiers;

    // Hill bonus
    if (TERRAIN_DATA[tile.terrain].isHill) {
      modifiers.terrain = 0.25;
    }

    // Feature bonus (forest, jungle)
    if (tile.feature === TileFeature.Forest || tile.feature === TileFeature.Jungle) {
      modifiers.feature = 0.25;
    }

    // River crossing bonus would require checking attacker's position
    // and whether they crossed a river edge

    return modifiers;
  }

  private removeUnit(eid: number): void {
    this.unitRenderer.removeUnit(eid);
    removeEntity(this.world, eid);
  }
}
```

### D4: Combat Preview

Create `src/combat/CombatPreview.ts`:

```typescript
export interface CombatPreviewData {
  attackerCurrentHealth: number;
  attackerMaxHealth: number;
  attackerExpectedHealth: number;  // After combat
  defenderCurrentHealth: number;
  defenderMaxHealth: number;
  defenderExpectedHealth: number;  // After combat
  attackerName: string;
  defenderName: string;
}

export class CombatPreview {
  // Similar reactive pattern to SelectionState
  private listeners: ((data: CombatPreviewData | null) => void)[] = [];
  private currentPreview: CombatPreviewData | null = null;

  show(data: CombatPreviewData): void {
    this.currentPreview = data;
    this.notify();
  }

  hide(): void {
    this.currentPreview = null;
    this.notify();
  }

  subscribe(listener: (data: CombatPreviewData | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentPreview);
    }
  }
}
```

## Integration Points

### 1. Turn System Integration

Combat execution should:
- Consume movement points (already planned)
- Work during `PlayerAction` phase only
- Dead units cleaned up before turn end

### 2. Unit Selection Integration

When a unit is selected and hovering over an enemy:
- Show combat preview instead of movement preview
- Change cursor to indicate attack action
- Right-click triggers attack instead of move

### 3. Movement System Integration

- Check for enemy units at target before movement
- If enemy at target and adjacent, offer attack option
- Movement through enemy tiles should be blocked

### 4. UI Integration

Combat preview panel showing:
- Attacker health bar (current and expected after combat)
- Defender health bar (current and expected after combat)
- Terrain modifier icons
- Expected outcome (victory/defeat probability)

## Proposed File Structure

```
src/combat/
  index.ts                 - Module exports
  CombatCalculator.ts      - Pure damage calculation functions
  CombatCalculator.test.ts - Unit tests for damage formulas
  CombatSystem.ts          - Combat execution with ECS integration
  CombatSystem.test.ts     - Integration tests
  CombatPreview.ts         - Reactive state for combat preview UI
  CombatModifiers.ts       - Terrain/feature defense bonus calculations
```

## Implementation Order

1. **D1: Combat Stats** (30 min)
   - Add `HealthComponent` to ECS world
   - Update `createUnitEntity` to initialize health
   - Add health getter functions to `unitSystems.ts`

2. **D2: Combat Calculation** (1 hour)
   - Create `CombatCalculator.ts` with pure functions
   - Write comprehensive unit tests for edge cases
   - Include terrain modifier calculations

3. **D3: Combat Execution** (1.5 hours)
   - Create `CombatSystem.ts` with `canAttack` and `executeAttack`
   - Integrate with `UnitRenderer` for unit removal
   - Add to main.ts event handling (right-click on enemy)

4. **D4: Combat Preview** (1 hour)
   - Create `CombatPreview.ts` reactive state
   - Create UI panel for health bars
   - Show preview on hover over enemy when unit selected

## Recommendations

1. **Start Simple**: Implement melee-only combat first. Ranged combat adds complexity with range checking and line-of-sight.

2. **Test Thoroughly**: Combat formulas have many edge cases. Write unit tests for:
   - Equal strength units
   - Very unequal strengths
   - Terrain modifiers stacking
   - Near-death units (low health)
   - Death thresholds (exactly 0 vs negative health)

3. **Visual Feedback**: Combat should have clear visual feedback:
   - Health bars above units
   - Damage numbers floating up
   - Death animation (or instant removal)
   - Combat sound effects (later)

4. **Balance Iteration**: The base damage value (30) and modifier percentages will need tuning. Consider making these configurable.

5. **Fortify Action**: Consider adding a "Fortify" unit action that provides additional defense bonus. This is standard in Civ games.

## Open Questions

1. **Ranged Combat Timing**: Should ranged attacks be resolved before melee in the same turn, or handled identically?

2. **Zone of Control**: Should units exert "zone of control" that costs extra movement to leave?

3. **Experience System**: Should units gain experience from combat for promotions? (Likely defer to later)

4. **Civilian Units**: How should civilian units (Settler) behave when attacked? (Instant capture? No defense?)

5. **Stacking**: Can multiple units occupy the same tile? (Current system appears to be one unit per tile)

6. **Combat Animation**: Should combat have a brief animation/delay, or be instant? (Affects game feel)

7. **Combat Log**: Should there be a combat log showing recent battles? (Useful for debugging and player info)

8. **Retreat Mechanic**: Can units retreat when about to die? (Not in base Civ, but some mods add this)
