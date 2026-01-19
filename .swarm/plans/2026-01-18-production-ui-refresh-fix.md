# Plan: Production UI Refresh Fix

**Date**: 2026-01-18
**Status**: Complete

## Overview

Fix the CityInfoPanel not updating after turn end by adding a `cityInfoPanel.refresh()` call to the `onTurnEnd` hook. This is a single-line fix that ensures production progress is visible to players immediately after ending their turn.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-production-turn-progress.md`:

- Production accumulation works correctly at TurnEnd phase via `cityProcessor.processTurnEnd()`
- The data updates properly, but the CityInfoPanel display is stale
- The `refresh()` method already exists on CityInfoPanel (lines 118-126)
- The fix pattern already exists in the codebase - `ProductionUI.onProductionSelected` calls `cityInfoPanel.refresh()`

## Phased Implementation

### Phase 1: Add UI Refresh to Turn End Hook

- [x] Add `cityInfoPanel.refresh()` call after `cityProcessor.processTurnEnd()` in the `onTurnEnd` hook

## Files to Create/Modify

| File | Action | Lines |
|------|--------|-------|
| `/Users/alex/workspace/civ/src/main.ts` | Modify | 351-355 |

## Code Change

**Before** (lines 351-355):
```typescript
onTurnEnd: () => {
  // Process city production and growth
  cityProcessor.processTurnEnd();
  console.log(`Turn ${gameState.getTurnNumber()} ending`);
},
```

**After**:
```typescript
onTurnEnd: () => {
  // Process city production and growth
  cityProcessor.processTurnEnd();
  // Refresh city panel to show updated production progress
  cityInfoPanel.refresh();
  console.log(`Turn ${gameState.getTurnNumber()} ending`);
},
```

## Success Criteria

- [x] CityInfoPanel shows updated production progress immediately after clicking "End Turn"
- [x] Production progress display format remains `ItemName (X/Y)` where X increases each turn
- [x] No console errors when ending turn with no city selected
- [x] No console errors when ending turn with a city selected

## Dependencies & Integration

- **Depends on**: CityInfoPanel.refresh() method (already exists)
- **Consumed by**: Player interaction flow
- **Integration points**: TurnSystem hooks in main.ts

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Calling refresh() with no city selected | The refresh() method already guards against null state (lines 119-121) |
| Performance impact from unnecessary refresh | Negligible - refresh only updates DOM if a city is selected |

## Testing Considerations

### Manual Testing Steps
1. Start the game and select a city
2. Set production to Warrior (or any unit)
3. Note the production progress display (e.g., "Warrior (0/40)")
4. Click "End Turn" or press Enter
5. Verify the production progress increases (e.g., "Warrior (2/40)" based on city's production yield)
6. Repeat until unit is produced

### Edge Cases
- End turn with no city selected (should not error)
- End turn after production completes (progress should reset to 0 or show next item)
- End turn with city panel hidden (refresh should be a no-op)

## Estimated Effort

- Implementation: 5 minutes (single line change)
- Testing: 10 minutes (manual verification)
