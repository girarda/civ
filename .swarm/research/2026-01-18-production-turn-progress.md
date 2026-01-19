# Research: Production Turn Progress Timing

**Date**: 2026-01-18
**Status**: Complete (Updated)

## Summary

Production progress IS correctly implemented and working. According to the implementation plan, production should accumulate at the **TurnEnd phase** (Phase 1 was completed), and this is exactly what happens. The `CityProcessor.processTurnEnd()` method is called via the `onTurnEnd` hook in main.ts, which accumulates production yields and spawns units when complete. The UI refresh issue (which was reported previously) has been **fixed** - `cityInfoPanel.refresh()` is now called after `cityProcessor.processTurnEnd()`.

## Key Questions Answered

### 1. After which phase should unit production progress on each turn according to the plan?

According to `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-production-system.md`:
- **Phase 1 (Production Selection UI)** was completed - this is the UI for selecting what to build
- Production progress happens during **TurnEnd phase**, as stated: "Turn integration complete: Wired to `turnSystem.onTurnEnd` in main.ts"
- The flow is: Player selects production -> Player ends turn -> `CityProcessor.processTurnEnd()` adds production yields -> Progress increments

### 2. Is production progress currently implemented? If so, where?

**YES, production progress is fully implemented.**

Key locations:
- `/Users/alex/workspace/civ/src/city/CityProcessor.ts` lines 86-103: `processProduction()` method accumulates progress
- `/Users/alex/workspace/civ/src/main.ts` lines 351-357: `onTurnEnd` hook calls `cityProcessor.processTurnEnd()`
- Production yields come from `calculateCityYields()` in `/Users/alex/workspace/civ/src/city/CityYields.ts`

### 3. Is "no visible progress after end turn" expected behavior or a bug?

**This was a UI refresh bug that has been FIXED.**

The production data was always updating correctly in the ECS components. The issue was that `CityInfoPanel` was not being refreshed after turn end. This fix was implemented at line 355 of main.ts:

```typescript
onTurnEnd: () => {
  // Process city production and growth
  cityProcessor.processTurnEnd();
  // Refresh city panel to show updated production progress
  cityInfoPanel.refresh();  // <-- This line was added to fix the issue
  console.log(`Turn ${gameState.getTurnNumber()} ending`);
},
```

## Architecture Overview

### Production Flow (Complete)

```
1. Player founds city (B key with Settler)
   |
   v
2. Player selects city (click)
   |
   v
3. Player selects production (ProductionUI buttons)
   |
   v
4. CityProcessor.setProduction(cityEid, buildableType)
   - Sets ProductionComponent.currentItem
   - Sets ProductionComponent.cost (from UNIT_TYPE_DATA)
   - Resets ProductionComponent.progress to 0
   |
   v
5. Player clicks "End Turn" (or presses Enter)
   |
   v
6. GameState.nextTurn() -> TurnPhase.TurnEnd
   |
   v
7. TurnSystem subscription triggers hooks.onTurnEnd()
   |
   v
8. cityProcessor.processTurnEnd()
   |
   v
9. For each city:
   a. processProduction(cityEid):
      - Calculate yields from territory tiles
      - Add yields.production to ProductionComponent.progress
      - If progress >= cost: completeProduction()
   b. processGrowth(cityEid):
      - Calculate net food
      - Accumulate food stockpile
      - If stockpile >= threshold: grow population
   |
   v
10. cityInfoPanel.refresh() <-- Updates UI display
   |
   v
11. GameState continues: TurnPhase.TurnStart -> TurnPhase.PlayerAction
```

### Production Completion Flow

When `progress >= cost`:
1. `completeProduction(cityEid, buildableType)` is called
2. Converts `BuildableType` to `UnitType` via `buildableToUnitType()`
3. Finds spawn position (currently city tile for MVP)
4. Creates unit entity via `createUnitEntity()`
5. Resets production: currentItem=0, progress=0, cost=0
6. Calls `onProductionCompleted` callback (renders unit graphic)

## Key Files

| File | Purpose | Relevant Lines |
|------|---------|----------------|
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Core production logic | 75-103 (processTurnEnd, processProduction) |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Production completion | 108-150 (completeProduction) |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Set production | 198-203 (setProduction) |
| `/Users/alex/workspace/civ/src/city/CityYields.ts` | Yield calculation | 14-31 (calculateCityYields) |
| `/Users/alex/workspace/civ/src/main.ts` | Turn integration | 351-357 (onTurnEnd hook with refresh fix) |
| `/Users/alex/workspace/civ/src/main.ts` | Production callback | 167-176 (onProductionCompleted renders unit) |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | Production display | 102-107 (displays progress/cost) |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | Refresh method | 118-126 (refresh for UI updates) |
| `/Users/alex/workspace/civ/src/ui/ProductionUI.ts` | Production selection | Handles button clicks |

## Production Processing Code

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
private processProduction(cityEid: number): void {
  const currentItem = ProductionComponent.currentItem[cityEid];
  if (currentItem === 0) return; // No production set

  // Calculate yields from city territory
  const yields = calculateCityYields(cityEid, this.territoryManager, this.tileMap);

  // Add production progress
  const newProgress = ProductionComponent.progress[cityEid] + yields.production;
  const cost = ProductionComponent.cost[cityEid];

  if (newProgress >= cost) {
    // Production complete - spawn unit
    this.completeProduction(cityEid, currentItem);
  } else {
    // Update progress
    ProductionComponent.progress[cityEid] = newProgress;
  }
}
```

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Production selection UI | COMPLETE | ProductionUI.ts with buttons |
| Production accumulation | COMPLETE | CityProcessor.processProduction() |
| Production completion | COMPLETE | Unit spawning works |
| Turn integration | COMPLETE | Wired to onTurnEnd hook |
| UI refresh after turn | COMPLETE | cityInfoPanel.refresh() called |
| Production queue | NOT IMPLEMENTED | Single item only (Phase 2 in plan) |
| Adjacent spawn position | NOT IMPLEMENTED | Spawns on city tile (Phase 3 in plan) |

## Recommendations

### If User Still Reports Issue

If the user is still not seeing production progress after ending a turn, verify:

1. **City has production set**: Check that `ProductionComponent.currentItem[cityEid] > 0`
2. **City has territory**: `calculateCityYields()` needs territory tiles to calculate production
3. **City panel is selected**: The refresh only updates if `currentCityEid !== null`
4. **Production yield > 0**: Check that territory tiles have production yields

### Debugging Steps

1. Open browser console
2. Found a city with a Settler (press B)
3. Click on the city to select it
4. Click a production button (e.g., "Warrior")
5. Observe: Panel should show "Warrior (0/40)"
6. Press Enter or click "End Turn"
7. Check console for: "Turn X ending"
8. Observe: Panel should now show "Warrior (Y/40)" where Y = city's production yield

### Potential Issues

1. **City not founded**: Only founded cities have territory and yield calculations
2. **Zero production yield**: If city has no production-generating tiles, progress will be 0
3. **Panel not visible**: UI refresh only updates visible panel content

## Open Questions (Resolved)

1. **When does production accumulate?** - Answer: TurnEnd phase (CORRECT)
2. **Is UI refresh working?** - Answer: YES, fix was implemented
3. **Is production logic correct?** - Answer: YES, fully functional

## Conclusion

**Production turn progress is fully implemented and working correctly.** The user's original report of "not seeing progress" was due to a UI refresh issue that has since been fixed. The implementation follows the plan:

1. Phase 1 (Production Selection UI) is complete
2. Production accumulates at TurnEnd phase as designed
3. CityInfoPanel refreshes after production processing

If the user is still experiencing issues, they should verify the debugging steps above or provide more specific details about what they're observing.
