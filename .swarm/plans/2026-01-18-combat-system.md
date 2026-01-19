# Plan: Combat System

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a combat system for OpenCiv that allows units to attack and damage each other. The system follows the 4-phase roadmap (D1-D4) from the research document: Combat Stats, Combat Calculation, Combat Execution, and Combat Preview. The combat system integrates with the existing turn system (actions during PlayerAction phase, movement points consumed) and unit system (ECS components, selection, movement).

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-combat-system.md`:

- **Unit Stats Available**: `UNIT_TYPE_DATA` already has `strength` (Warrior: 8, Scout: 5, Settler: 0), `rangedStrength`, and `range` fields
- **No Health Component**: Units need a `HealthComponent` added to ECS
- **Terrain Modifiers**: `TERRAIN_DATA.isHill` provides +25% defense; Forest/Jungle features can add +25%
- **Existing Utilities**: `getUnitAtPosition()` finds enemy units; `UnitRenderer.removeUnit()` handles cleanup
- **Turn Integration**: Combat should occur during `TurnPhase.PlayerAction`; attacking consumes all movement points
- **Reactive Pattern**: Use `SelectionState`-style reactive state for combat preview UI

Combat formula (Civ 5 inspired):
- Base damage = 30 * (attacker_strength / defender_strength)
- Apply defender terrain/feature bonuses (stacking)
- Health affects effective strength proportionally
- Attacker takes reduced counter-damage (0.5x multiplier)

## Phased Implementation

### Phase 1: Combat Stats Component (D1)

**Goal**: Add health tracking to units via ECS component.

#### Tasks

- [ ] Add `HealthComponent` to `/Users/alex/workspace/civ/src/ecs/world.ts`
  ```typescript
  export const HealthComponent = defineComponent({
    current: Types.ui8,  // Current health (0-100)
    max: Types.ui8,      // Maximum health (100)
  });
  ```
- [ ] Update `createUnitEntity()` to add `HealthComponent` with default maxHealth=100
- [ ] Update `unitQuery` to include `HealthComponent`
- [ ] Add health helper functions to `/Users/alex/workspace/civ/src/ecs/unitSystems.ts`:
  - `getUnitHealth(eid)` - returns `{ current, max }`
  - `setUnitHealth(eid, health)` - updates current health
  - `isUnitAlive(eid)` - checks if health > 0
- [ ] Write unit tests for health component operations

#### Success Criteria

- [ ] All units spawn with 100/100 health
- [ ] Health can be read and modified via helper functions
- [ ] Existing unit spawning and movement still works
- [ ] Unit tests pass for health operations

---

### Phase 2: Combat Calculation (D2)

**Goal**: Create pure functions for damage calculation with terrain modifiers.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/combat/CombatModifiers.ts`:
  - `getTerrainDefenseBonus(terrain)` - returns 0.25 for hills, 0 otherwise
  - `getFeatureDefenseBonus(feature)` - returns 0.25 for Forest/Jungle, 0 otherwise
  - `getTotalDefenseModifier(tile)` - combines terrain + feature bonuses
- [ ] Create `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts`:
  ```typescript
  export interface CombatResult {
    attackerDamage: number;     // Damage dealt TO attacker
    defenderDamage: number;     // Damage dealt TO defender
    attackerSurvives: boolean;
    defenderSurvives: boolean;
  }

  export interface CombatContext {
    attackerStrength: number;
    defenderStrength: number;
    attackerHealth: number;
    defenderHealth: number;
    defenseModifier: number;    // Total defense bonus (0.0 - 0.5+)
  }

  export function calculateCombat(context: CombatContext): CombatResult;
  ```
- [ ] Implement damage formula:
  - Effective attacker strength = attackerStrength * (attackerHealth / 100)
  - Effective defender strength = defenderStrength * (defenderHealth / 100) * (1 + defenseModifier)
  - Ratio = effectiveAttacker / effectiveDefender
  - Defender damage = round(30 * ratio)
  - Attacker damage = round(30 / ratio * 0.5)
- [ ] Handle edge cases:
  - Zero-strength defender (civilian units): instant death, no counter-damage
  - Very low health: minimum 1 damage if attacker strength > 0
  - Cap damage at current health
- [ ] Create `/Users/alex/workspace/civ/src/combat/index.ts` - module exports
- [ ] Write comprehensive unit tests in `/Users/alex/workspace/civ/src/combat/CombatCalculator.test.ts`:
  - Equal strength units
  - Unequal strength (2:1, 1:2 ratios)
  - Terrain modifiers (hills, forest, both)
  - Damaged units (50% health)
  - Near-death scenarios
  - Zero-strength defender

#### Success Criteria

- [ ] `calculateCombat()` returns correct damage values for all test cases
- [ ] Terrain/feature bonuses stack correctly (+25% each = +50% total)
- [ ] Zero-strength units die instantly with no counter-damage
- [ ] All damage values are integers >= 0
- [ ] Unit tests achieve >90% coverage of combat logic

---

### Phase 3: Combat Execution (D3)

**Goal**: Implement attack command with ECS integration and unit removal.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/combat/CombatSystem.ts`:
  ```typescript
  export class CombatExecutor {
    constructor(
      world: IWorld,
      tileMap: Map<string, GeneratedTile>,
      unitRenderer: UnitRenderer,
      selectionState: SelectionState
    );

    canAttack(attackerEid: number, targetPos: TilePosition): boolean;
    executeAttack(attackerEid: number, targetPos: TilePosition): CombatResult | null;
  }
  ```
- [ ] Implement `canAttack()` validation:
  - Attacker has movement points > 0
  - Target position has an enemy unit (different owner)
  - Target is adjacent to attacker (melee only for now)
  - Attacker has strength > 0 (non-civilian)
- [ ] Implement `executeAttack()`:
  - Get attacker/defender stats from ECS
  - Get defender tile modifiers
  - Call `calculateCombat()`
  - Apply damage to both units' `HealthComponent`
  - Set attacker's movement points to 0 (attacking ends turn for unit)
  - Remove dead units (health <= 0):
    - Call `unitRenderer.removeUnit(eid)`
    - Call `removeEntity(world, eid)`
    - If selected unit dies, call `selectionState.deselect()`
  - Return combat result for UI feedback
- [ ] Add attack input handling to `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts`:
  - On right-click, check if target has enemy unit
  - If enemy: attempt attack instead of move
  - If empty tile: attempt move (existing behavior)
- [ ] Integrate with turn system - attacking works only during `PlayerAction` phase
- [ ] Update `/Users/alex/workspace/civ/src/combat/index.ts` exports
- [ ] Write unit tests for `CombatExecutor`
- [ ] Write E2E test for attack flow

#### Success Criteria

- [ ] Right-clicking enemy unit with selected unit triggers attack
- [ ] Combat damage is applied correctly to both units
- [ ] Dead units are removed from ECS and renderer
- [ ] Attacker's movement points are set to 0 after attacking
- [ ] Cannot attack without movement points
- [ ] Cannot attack own units
- [ ] Selection clears if selected unit dies
- [ ] E2E test passes: select warrior, attack enemy, verify damage

---

### Phase 4: Combat Preview (D4)

**Goal**: Show expected combat outcome before committing to attack.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/combat/CombatPreview.ts`:
  ```typescript
  export interface CombatPreviewData {
    attackerName: string;
    defenderName: string;
    attackerCurrentHealth: number;
    attackerMaxHealth: number;
    attackerExpectedHealth: number;  // After combat
    defenderCurrentHealth: number;
    defenderMaxHealth: number;
    defenderExpectedHealth: number;  // After combat
    defenderModifiers: string[];     // e.g., ["Hills +25%", "Forest +25%"]
  }

  export class CombatPreviewState {
    show(data: CombatPreviewData): void;
    hide(): void;
    get(): CombatPreviewData | null;
    subscribe(listener: (data: CombatPreviewData | null) => void): () => void;
  }
  ```
- [ ] Create `/Users/alex/workspace/civ/src/ui/CombatPreviewPanel.ts`:
  - DOM panel similar to TileInfoPanel
  - Shows attacker and defender health bars
  - Shows expected health after combat
  - Lists active defense modifiers
  - Position panel near cursor or at fixed screen location
- [ ] Add CSS styles to `/Users/alex/workspace/civ/src/style.css`:
  ```css
  #combat-preview { ... }
  .health-bar { ... }
  .health-bar-fill { ... }
  .expected-health { ... }
  .modifier-list { ... }
  ```
- [ ] Add HTML elements to `/Users/alex/workspace/civ/index.html`:
  ```html
  <div id="combat-preview" class="hidden">
    <div class="attacker-section">...</div>
    <div class="defender-section">...</div>
  </div>
  ```
- [ ] Integrate preview trigger in hover system:
  - When unit is selected AND hovering over enemy unit
  - Calculate preview using `CombatCalculator`
  - Show preview panel with expected outcomes
  - Hide preview when hovering empty tile or own unit
- [ ] Add attack cursor indicator (optional):
  - Change cursor style when hovering attackable target
- [ ] Update `/Users/alex/workspace/civ/src/ui/index.ts` exports
- [ ] Write unit tests for `CombatPreviewState`
- [ ] Write E2E test for preview display

#### Success Criteria

- [ ] Hovering over enemy with selected unit shows combat preview panel
- [ ] Preview shows correct health bar values (current and expected)
- [ ] Preview lists applicable terrain/feature modifiers
- [ ] Preview hides when not hovering valid attack target
- [ ] Preview updates in real-time as cursor moves
- [ ] E2E test passes: select unit, hover enemy, verify preview content

---

### Phase 5: Integration and Polish

**Goal**: Wire everything together and ensure robust integration.

#### Tasks

- [ ] Update `/Users/alex/workspace/civ/src/main.ts`:
  - Import combat modules
  - Create `CombatExecutor` instance
  - Create `CombatPreviewState` instance
  - Create `CombatPreviewPanel` instance
  - Wire hover state to update combat preview
  - Pass combat executor to selection system
- [ ] Update movement system to check for enemies:
  - Cannot move through tiles with enemy units
  - Pathfinder should treat enemy-occupied tiles as blocked
- [ ] Add unit health bars (optional enhancement):
  - Small health bar above each unit
  - Only show when damaged (health < max)
- [ ] Handle edge case: attacking unit that dies to counter-damage
  - Ensure proper cleanup and selection reset
- [ ] Update `/Users/alex/workspace/civ/CLAUDE.md`:
  - Add combat module documentation
  - Update architecture section
- [ ] Run full test suite and fix any failures
- [ ] Manual testing checklist:
  - [ ] Warrior attacks Warrior (equal strength)
  - [ ] Warrior attacks Scout (unequal strength)
  - [ ] Warrior attacks Settler (zero defense)
  - [ ] Attack on hills (defender bonus)
  - [ ] Attack in forest (defender bonus)
  - [ ] Attack after moving (movement consumed)
  - [ ] Attack with low health unit
  - [ ] Multi-turn combat (attack, end turn, attack again)

#### Success Criteria

- [ ] Full combat flow works end-to-end
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No console errors during normal gameplay
- [ ] CLAUDE.md accurately documents combat system
- [ ] Manual testing checklist complete

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/ecs/world.ts` | Modify | Add HealthComponent, update createUnitEntity |
| `/Users/alex/workspace/civ/src/ecs/unitSystems.ts` | Modify | Add health helper functions |
| `/Users/alex/workspace/civ/src/combat/CombatModifiers.ts` | Create | Terrain/feature defense calculations |
| `/Users/alex/workspace/civ/src/combat/CombatCalculator.ts` | Create | Pure combat damage calculations |
| `/Users/alex/workspace/civ/src/combat/CombatCalculator.test.ts` | Create | Unit tests for damage formulas |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Create | Combat execution with ECS integration |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.test.ts` | Create | Unit tests for combat executor |
| `/Users/alex/workspace/civ/src/combat/CombatPreview.ts` | Create | Reactive state for combat preview |
| `/Users/alex/workspace/civ/src/combat/index.ts` | Create | Module exports |
| `/Users/alex/workspace/civ/src/ui/CombatPreviewPanel.ts` | Create | DOM panel for combat preview |
| `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts` | Modify | Add attack handling on right-click |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify | Export CombatPreviewPanel |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Initialize and wire combat systems |
| `/Users/alex/workspace/civ/src/style.css` | Modify | Add combat preview styles |
| `/Users/alex/workspace/civ/index.html` | Modify | Add combat preview DOM elements |
| `/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts` | Modify | Block enemy-occupied tiles |
| `/Users/alex/workspace/civ/CLAUDE.md` | Modify | Document combat module |
| `/Users/alex/workspace/civ/e2e/combat.spec.ts` | Create | E2E tests for combat flow |

**Total: 10 files to create, 8 files to modify**

---

## Success Criteria

### Functional Requirements
- [ ] Units can attack adjacent enemy units
- [ ] Combat damage follows documented formula
- [ ] Terrain and feature modifiers affect defense
- [ ] Health affects combat effectiveness
- [ ] Dead units are removed from game
- [ ] Combat preview shows expected outcome
- [ ] Attacking consumes all movement points

### Turn System Integration
- [ ] Combat only works during PlayerAction phase
- [ ] Cannot attack without movement points
- [ ] Movement points reset at turn start (existing behavior)
- [ ] Unit health persists across turns

### Unit System Integration
- [ ] Uses existing ECS components and queries
- [ ] Uses existing UnitRenderer for removal
- [ ] Uses existing SelectionState for deselection
- [ ] Right-click on enemy triggers attack (vs move on empty)

### Code Quality Requirements
- [ ] All new modules have unit tests
- [ ] E2E test covers select-attack-verify flow
- [ ] No TypeScript errors or ESLint warnings
- [ ] Public functions have JSDoc comments

---

## Dependencies & Integration

### Depends On
- **ECS World** (`/Users/alex/workspace/civ/src/ecs/world.ts`): Components, entity creation
- **Unit Queries** (`/Users/alex/workspace/civ/src/ecs/unitSystems.ts`): getUnitAtPosition, getAllUnits
- **Unit Types** (`/Users/alex/workspace/civ/src/unit/UnitType.ts`): UNIT_TYPE_DATA with strength values
- **Terrain Data** (`/Users/alex/workspace/civ/src/tile/Terrain.ts`): TERRAIN_DATA.isHill
- **Feature Data** (`/Users/alex/workspace/civ/src/tile/TileFeature.ts`): Forest/Jungle detection
- **Unit Renderer** (`/Users/alex/workspace/civ/src/render/UnitRenderer.ts`): removeUnit for dead units
- **Selection State** (`/Users/alex/workspace/civ/src/ui/SelectionState.ts`): Deselect dead units
- **Turn System** (`/Users/alex/workspace/civ/src/game/`): TurnPhase for action validation

### Consumed By (Future Phases)
- **AI System**: AI needs to evaluate attack options using CombatCalculator
- **Victory Conditions**: Check for all enemy units/cities destroyed
- **Unit Experience**: Combat outcomes could feed into promotion system
- **Combat Log**: Record combat results for player review

### Integration Points
- **ECS World**: HealthComponent added to unit entities
- **Selection System**: Right-click branches to attack vs move
- **Hover System**: Triggers combat preview on enemy hover
- **Turn Processing**: Combat respects turn phases
- **Pathfinding**: Enemy tiles blocked for movement

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Combat feels unfair/unbalanced | Medium | Medium | Start with simple formula, tune BASE_DAMAGE and modifier values through playtesting |
| Both units die simultaneously | Low | Low | Process defender death first, then attacker; ensure proper cleanup order |
| Selection state corruption on death | Medium | Medium | Explicitly deselect before removing entity; verify with unit tests |
| Preview flickers during mouse movement | Low | Medium | Debounce hover updates; cache preview data |
| ECS entity removal causes dangling references | Medium | Low | Clear all references (renderer, selection) before removeEntity |
| Combat during invalid turn phase | Low | Low | Check TurnPhase in canAttack; return false if not PlayerAction |

---

## Testing Strategy

### Unit Tests

**CombatCalculator.test.ts**
- Equal strength: 8 vs 8 at full health
- Advantage: 8 vs 5 (Warrior vs Scout)
- Disadvantage: 5 vs 8
- Terrain bonus: defender on hills (+25%)
- Feature bonus: defender in forest (+25%)
- Stacked bonuses: hills + forest (+50%)
- Damaged attacker: 50% health
- Damaged defender: 50% health
- Both damaged: 50% each
- Zero-strength defender: instant kill
- Near-lethal damage: caps at current health

**CombatSystem.test.ts**
- canAttack with valid target
- canAttack with no movement
- canAttack with non-adjacent target
- canAttack with own unit (should fail)
- canAttack with civilian attacker (should fail)
- executeAttack damage application
- executeAttack unit removal on death
- executeAttack movement consumption

**CombatPreview.test.ts**
- Show/hide state management
- Subscriber notifications
- Correct preview data calculation

### E2E Tests

**combat.spec.ts**
- Select warrior, attack adjacent enemy warrior
- Verify damage numbers displayed
- Verify health bars update
- Verify dead unit removed from screen
- Verify combat preview shows before attack
- Verify cannot attack after movement exhausted

---

## Appendix: Combat Formula Reference

### Base Damage Calculation

```
effectiveAttackerStrength = attackerStrength * (attackerHealth / 100)
effectiveDefenderStrength = defenderStrength * (defenderHealth / 100) * (1 + defenseModifier)

ratio = effectiveAttackerStrength / effectiveDefenderStrength

defenderDamage = round(BASE_DAMAGE * ratio)       // BASE_DAMAGE = 30
attackerDamage = round(BASE_DAMAGE / ratio * 0.5) // Counter-attack at 50%
```

### Defense Modifier Sources

| Source | Bonus | Stacks |
|--------|-------|--------|
| Hills terrain | +25% | Yes |
| Forest feature | +25% | Yes |
| Jungle feature | +25% | Yes |
| River crossing | +25% | Future |
| Fortified | +25% | Future |

### Unit Strength Reference

| Unit | Strength | Notes |
|------|----------|-------|
| Warrior | 8 | Standard melee |
| Scout | 5 | Fast but weak |
| Settler | 0 | Civilian - instant death |

---

## Appendix: Open Questions (Deferred)

These questions were identified in research but deferred to future phases:

1. **Ranged Combat**: How should ranged attacks work? (Range checking, no counter-attack)
2. **Zone of Control**: Should units exert ZoC affecting enemy movement?
3. **Experience System**: Should units gain XP from combat?
4. **Civilian Capture**: Should attacking Settler capture instead of kill? (Deferred - treating as 0-strength for now)
5. **Combat Animations**: Should combat have visual effects? (Deferred - instant resolution for now)
6. **Combat Log**: Should battles be recorded for player review?
7. **Fortify Action**: Should units be able to fortify for extra defense?
8. **Retreat Mechanic**: Can units retreat when about to die?

These can be addressed in future iterations after core combat is working.
