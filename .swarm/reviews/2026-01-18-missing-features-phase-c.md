# Human Review: Phase C - Polish (Hotkeys, Seed Display)

**Date**: 2026-01-18
**Feature**: Map regeneration controls with seed display and R key shortcut
**Branch**: feature/2026-01-18-missing-features-phase-c
**Plan File**: .swarm/plans/2026-01-18-missing-features.md

## Summary

This phase implements quality-of-life features for the OpenCiv map system:
- Seed display in the top-right corner showing current map generation seed
- Map regeneration via "Regenerate (R)" button click
- Keyboard shortcut (R key) for quick map regeneration
- Updated CLAUDE.md documentation

## Files Changed

### New Files
- `src/ui/MapControls.ts` - UI component for seed display and regeneration controls
- `tests/e2e/map-controls.spec.ts` - 11 E2E tests for map controls functionality

### Modified Files
- `index.html` - Added `#map-controls` container with seed display and regenerate button
- `src/style.css` - Added styles for map controls (positioning, colors, hover/focus states)
- `src/ui/index.ts` - Added MapControls export
- `src/main.ts` - Integrated MapControls with regeneration callback, refactored map generation into reusable function
- `CLAUDE.md` - Updated module structure documentation
- `tests/e2e/map.spec.ts-snapshots/map-rendered-chromium-darwin.png` - Updated snapshot to include new UI

## Key Implementation Details

### MapControls Component
```typescript
// Key features:
- Constructor validates DOM elements and throws on missing
- Keyboard handler stored for proper cleanup (attach/detach)
- R key filtering prevents triggering while typing in inputs
- Random seed generation (0-999999)
- setSeed() updates both internal state and DOM
```

### Map Regeneration Flow
```typescript
function generateMap(seed: number): void {
  tileRenderer.clear();    // Clear PixiJS graphics
  tileMap.clear();         // Clear tile lookup map
  hoverState.set(null);    // Reset hover state
  tileHighlight.hide();    // Hide highlight
  // Generate and render new map...
}
```

### CSS Accessibility
- Focus state with outline for keyboard navigation
- Active state for click feedback
- Hover state for mouse interaction

## Testing Instructions

### Manual Testing
1. Start dev server: `npm run dev`
2. Open browser to http://localhost:5173
3. Verify:
   - Seed display visible in top-right corner
   - "Regenerate (R)" button visible next to seed
   - Click button → seed changes, map regenerates
   - Press R key → seed changes, map regenerates
   - Tab to button → focus outline appears
   - Hover button → background color changes
   - Different seeds produce visually different maps

### Automated Tests
```bash
npm run test        # 261 unit tests pass
npm run test:e2e    # 46 E2E tests pass (11 new for map controls)
npm run build       # Production build succeeds
```

## Code Review Summary

### Logic Review
- No critical issues
- DOM element validation is thorough
- Event handler lifecycle properly managed (attach/detach)
- State management is clean with proper cleanup on regeneration

### Style Review
- Consistent with existing codebase patterns
- TypeScript types properly annotated
- CSS follows established conventions
- JSDoc comments on all public methods

### Performance Review
- DOM elements cached in constructor (no repeated queries)
- Event handlers properly stored for cleanup
- Synchronous map generation prevents race conditions
- HoverState optimization prevents duplicate notifications

## Decisions Made

1. **Initial seed value**: Defaulted to 42 (matching existing MapConfig default)
2. **Seed range**: 0-999999 for display readability
3. **Keyboard filtering**: Only check HTMLInputElement (no textarea in current UI)
4. **Position**: Top-right corner to complement bottom-left tile info panel

## Merge Instructions

```bash
# From the main repository directory:
cd /Users/alex/workspace/civ

# Fetch the worktree branch
git fetch . feature/2026-01-18-missing-features-phase-c:feature/2026-01-18-missing-features-phase-c

# Merge or cherry-pick as preferred
git merge feature/2026-01-18-missing-features-phase-c

# Or create PR
cd /Users/alex/workspace/civ-missing-features-phase-c
git push -u origin feature/2026-01-18-missing-features-phase-c
gh pr create --title "feat: implement map controls (Phase C)" --body "..."
```

## Cleanup

After merge, remove the worktree:
```bash
cd /Users/alex/workspace/civ
git worktree remove ../civ-missing-features-phase-c
git branch -d feature/2026-01-18-missing-features-phase-c  # if merged
```

## Success Criteria Verification

From the plan file:
- [x] Pressing 'R' regenerates map with new random seed
- [x] Current seed displays in top-right corner
- [x] Regenerate button works same as R key
- [x] New seed produces different map; same seed produces identical map (deterministic via MapGenerator)
- [x] CLAUDE.md is accurate and up to date
- [x] Key public functions have JSDoc comments
- [x] All existing tests pass after changes (261 unit + 46 E2E)
