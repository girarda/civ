# Combat System Implementation Review

**Date:** 2026-01-18
**Feature:** Combat System
**Branch:** `feature/2026-01-18-combat-system`
**Worktree:** `/Users/alex/workspace/civ-2026-01-18-combat-system`

## Summary

This implementation adds a Civilization-style melee combat system to OpenCiv. Units can now attack adjacent enemy units with damage calculation based on unit strength, health, and terrain modifiers.

## Changes Made

### New Files Created

| File | Description |
|------|-------------|
| `src/combat/CombatModifiers.ts` | Terrain and feature defense bonus calculations |
| `src/combat/CombatCalculator.ts` | Pure combat damage calculation functions |
| `src/combat/CombatSystem.ts` | Combat execution system (CombatExecutor) |
| `src/combat/CombatPreview.ts` | Reactive state for combat preview UI |
| `src/combat/index.ts` | Module exports |
| `src/ui/CombatPreviewPanel.ts` | Combat preview UI panel |
| `src/combat/CombatCalculator.test.ts` | Unit tests for combat calculation |
| `src/combat/CombatSystem.test.ts` | Unit tests for combat executor |
| `src/combat/CombatPreview.test.ts` | Unit tests for preview state |
| `tests/e2e/combat.spec.ts` | E2E tests for combat system |

### Modified Files

| File | Changes |
|------|---------|
| `src/ecs/world.ts` | Added `HealthComponent`, updated `createUnitEntity()` and `unitQuery` |
| `src/ecs/unitSystems.ts` | Added `getUnitHealth()`, `setUnitHealth()`, `isUnitAlive()` |
| `src/ecs/unitSystems.test.ts` | Added tests for health functions |
| `src/ui/index.ts` | Added `CombatPreviewPanel` export |
| `src/main.ts` | Integrated combat system, spawns two units for testing |
| `index.html` | Added combat preview panel HTML |
| `src/style.css` | Added combat preview panel styles |

## Key Design Decisions

### 1. Health Component (0-100 scale)
- Used `Types.ui8` for efficient storage
- Default health is 100 for all units
- Health affects combat strength proportionally

### 2. Combat Formula (Civ 5 inspired)
```
effectiveAttacker = attackerStrength * (attackerHealth / 100)
effectiveDefender = defenderStrength * (defenderHealth / 100) * (1 + defenseModifier)
ratio = effectiveAttacker / effectiveDefender
defenderDamage = round(30 * ratio)
attackerDamage = round(30 / ratio * 0.5)  // Counter-attack
```

### 3. Terrain Defense Bonuses
- Hills: +25% defense
- Forest: +25% defense
- Jungle: +25% defense
- Bonuses stack (max +50% for hills + forest)

### 4. Combat Execution Rules
- Attack consumes all remaining movement points
- Zero-strength defenders (civilians) die instantly with no counter-attack
- Dead units are removed from ECS and renderer
- Selection is cleared if selected unit dies

## Testing Instructions

### Manual Testing

1. Start the dev server:
   ```bash
   cd /Users/alex/workspace/civ-2026-01-18-combat-system
   npm run dev
   ```

2. Two warriors spawn adjacent to each other (blue = player 0, red = player 1)

3. Click on the blue warrior to select it

4. Hover over the red warrior - combat preview should appear showing expected damage

5. Right-click on the red warrior to attack

6. Observe console log: "Combat: Attacker took X damage, Defender took Y damage"

7. Continue attacking until one unit dies

8. Press R to regenerate map and test with different terrain

### Automated Tests

```bash
# Run all unit tests
npm run test

# Run combat-specific tests
npm run test -- src/combat/

# Run E2E tests
npm run test:e2e -- tests/e2e/combat.spec.ts
```

## Validation Results

| Check | Status |
|-------|--------|
| Unit Tests | ✅ 424 tests passing |
| ESLint | ✅ No errors |
| TypeScript Build | ✅ Successful |
| E2E Tests | ✅ 6 tests passing |

## Merge Instructions

```bash
# From the main repository
cd /Users/alex/workspace/civ

# Merge the feature branch
git merge feature/2026-01-18-combat-system

# Or create a PR
cd /Users/alex/workspace/civ-2026-01-18-combat-system
git push -u origin feature/2026-01-18-combat-system
gh pr create --title "feat: implement combat system" --body "..."
```

## Cleanup

After merging, remove the worktree:
```bash
git worktree remove /Users/alex/workspace/civ-2026-01-18-combat-system
```

## Known Limitations / Future Enhancements

1. **No ranged combat** - Only melee attacks are implemented. The `rangedStrength` and `range` fields exist in `UnitTypeData` but are not used.

2. **No unit capture** - Defeating a Settler simply removes it rather than capturing.

3. **No experience/promotions** - Units don't gain XP from combat.

4. **Single attack per turn** - Units can only attack once per turn (movement consumed).

5. **No fortification bonus** - Stationary units don't gain additional defense.

## Files for Detailed Review

Priority files for code review:

1. `src/combat/CombatCalculator.ts` - Core damage formula
2. `src/combat/CombatSystem.ts` - Combat execution logic
3. `src/main.ts` - Integration changes (lines 84-95, 215-278)
