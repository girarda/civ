# Human Review: Notification System

## Summary

This PR implements a notification system for OpenCiv that provides:
1. **Toast notifications** for player-facing messages (city founded, unit produced, warnings)
2. **Debug overlay** for developer logging (replaces console.log)
3. **Migration** of all console.log calls to use the new system

## Files Changed

### New Files
- `src/ui/NotificationState.ts` - Core state management with reactive subscriptions
- `src/ui/NotificationPanel.ts` - Auto-dismissing toast UI
- `src/ui/DebugOverlay.ts` - Scrollable debug log with localStorage persistence
- `src/ui/NotificationState.test.ts` - 22 unit tests
- `tests/e2e/notification.spec.ts` - 18 E2E tests

### Modified Files
- `index.html` - Added DOM containers for notifications and debug overlay
- `src/style.css` - Added styles for toast and debug UI
- `src/ui/index.ts` - Export new modules
- `src/main.ts` - Integrated notification system and migrated console.logs
- `tests/e2e/combat.spec.ts` - Updated to use debug overlay instead of console.log
- `tests/e2e/player-faction.spec.ts` - Updated to use debug overlay
- `tests/e2e/unit.spec.ts` - Updated to use debug overlay

## Key Decisions

### Notification Types
- `Info` - General information (population growth)
- `Success` - Positive events (city founded, unit produced, player eliminated)
- `Warning` - User errors or constraints (cannot found city)
- `Error` - System errors (not used yet, for future)
- `Debug` - Developer logging (only shows when debug mode enabled)

### Debug Mode Toggle
- Backtick key (`) toggles debug overlay
- State persists in localStorage (`openciv-debug`)
- Debug messages are suppressed when overlay is hidden (performance)

### Toast Behavior
- Max 5 visible toasts at once
- Auto-dismiss after 5 seconds
- Slide-in animation from left
- Fade-out animation on dismiss

## Testing Instructions

1. **Toast Notifications**
   - Select settler and press B to found a city -> "Founded [CityName]!" toast
   - Select non-settler and press B -> "Only Settlers can found cities" warning
   - End turns to complete production -> "[UnitName] ready!" toast

2. **Debug Overlay**
   - Press backtick (`) to toggle debug overlay
   - Press R to regenerate map -> "[MAP] Generated" entry appears
   - End turn -> "[TURN] Started/Ending" entries appear
   - Reload page -> debug state should persist

3. **Run Tests**
   ```bash
   npm run test           # 654 unit tests
   npm run test:e2e       # 129 E2E tests
   npm run build          # Production build
   ```

## Merge Instructions

```bash
# From main repository
git fetch origin
git checkout main
git merge feature/2026-01-18-notification-system
git push
```

Or create PR with:
```bash
cd ../civ-2026-01-18-notification-system
git push -u origin feature/2026-01-18-notification-system
gh pr create --title "feat: implement notification system with toast UI and debug overlay" --body "See .swarm/reviews/2026-01-18-notification-system.md for details"
```

## Post-Merge Cleanup

After merge, remove the worktree:
```bash
git worktree remove ../civ-2026-01-18-notification-system
```

## Validation Results

- Unit Tests: 654 passed
- E2E Tests: 129 passed
- Lint: No errors
- Build: Success
