# Human Review: CLI Frontend (civctl)

**Date**: 2026-01-18
**Branch**: `feature/2026-01-18-cli-frontend`
**Worktree**: `/Users/alex/workspace/civ-2026-01-18-cli-frontend`

## Summary

Implemented `civctl`, a command-line interface for OpenCiv that enables programmatic game control through the GameEngine API. The CLI supports both text and JSON output formats, making it suitable for both human operators and AI agents.

## Changes Made

### New Files Created

| File | Description |
|------|-------------|
| `src/cli/civctl.ts` | CLI entry point with commander setup |
| `src/cli/index.ts` | Module exports |
| `src/cli/context.ts` | Engine initialization and state management |
| `src/cli/utils.ts` | Shared utilities (error handling, option parsing) |
| `src/cli/formatters/text.ts` | Human-readable output formatting |
| `src/cli/formatters/json.ts` | JSON output formatting |
| `src/cli/formatters/index.ts` | Formatter exports |
| `src/cli/commands/game.ts` | game status, end-turn, new commands |
| `src/cli/commands/unit.ts` | unit list, show, move, attack, found-city |
| `src/cli/commands/city.ts` | city list, show, production commands |
| `src/cli/commands/map.ts` | map tile, info commands |
| `src/cli/commands/player.ts` | player list command |
| `src/cli/commands/game.test.ts` | Unit tests for game commands |
| `src/cli/commands/unit.test.ts` | Unit tests for unit commands |
| `src/cli/commands/city.test.ts` | Unit tests for city commands |
| `src/cli/commands/map.test.ts` | Unit tests for map commands |
| `tests/e2e/cli.spec.ts` | E2E tests for CLI |

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Added commander, esbuild dependencies; added build:cli script |
| `CLAUDE.md` | Added CLI usage documentation |

## Testing Instructions

### Build the CLI

```bash
cd /Users/alex/workspace/civ-2026-01-18-cli-frontend
npm run build:cli
```

### Run Unit Tests

```bash
npm run test src/cli
```

Expected: 40 tests pass

### Run E2E Tests

```bash
npm run test:e2e tests/e2e/cli.spec.ts
```

Expected: 16 tests pass

### Manual Testing

```bash
# Show help
node dist/civctl.cjs --help

# Create new game
node dist/civctl.cjs game new --seed 12345

# Check game status (text)
node dist/civctl.cjs game status

# Check game status (JSON)
node dist/civctl.cjs game status -o json

# End turn
node dist/civctl.cjs game end-turn

# List units
node dist/civctl.cjs unit list

# Get map info
node dist/civctl.cjs map info

# Get tile at coordinates
node dist/civctl.cjs map tile 0,0

# List players
node dist/civctl.cjs player list
```

## Code Review Findings

### Applied Fixes

1. **Extracted shared utilities** - Created `src/cli/utils.ts` with `getOutputFormat()`, `getStateFile()`, and `handleError()` to eliminate code duplication across all command files.

2. **Fixed city production display** - Changed city production command to use actual game state (`updatedCity?.production.currentItemName`) instead of user input string for display output.

3. **Optimized player list** - Changed O(n*m) filtering to O(n+m) counting using `Record<number, number>` maps.

### Items for Human Review

1. **State Persistence Limitation**: The CLI saves full game snapshots but cannot restore turn state due to unimplemented `GameEngine.fromSnapshot()`. Only map seed is preserved between invocations. Consider implementing full snapshot restoration in a future iteration.

2. **JSON Pretty-Printing**: All JSON output uses 2-space indentation for readability. For high-throughput scenarios, consider adding a `--compact` flag.

3. **Pathfinder Initialization**: The pathfinder is initialized on every command, even read-only ones. This adds startup overhead but ensures correctness. Could be lazily initialized if startup time becomes an issue.

## Merge Instructions

### From the main repository:

```bash
cd /Users/alex/workspace/civ

# Fetch the feature branch
git fetch

# Merge the feature branch
git merge feature/2026-01-18-cli-frontend

# Or create a PR using:
cd /Users/alex/workspace/civ-2026-01-18-cli-frontend
git push -u origin feature/2026-01-18-cli-frontend
gh pr create --title "feat: add civctl CLI for programmatic game control" --body "## Summary
- Implements civctl CLI with commander.js
- Supports text and JSON output formats
- Commands: game, unit, city, map, player
- 40 unit tests + 16 E2E tests

## Testing
- npm run build:cli && node dist/civctl.cjs --help
- npm run test src/cli
- npm run test:e2e tests/e2e/cli.spec.ts"
```

### Cleanup After Merge

```bash
# Remove the worktree (after merge is complete)
cd /Users/alex/workspace/civ
git worktree remove /Users/alex/workspace/civ-2026-01-18-cli-frontend

# Delete the feature branch locally
git branch -d feature/2026-01-18-cli-frontend

# Delete the feature branch remotely (if pushed)
git push origin --delete feature/2026-01-18-cli-frontend
```

## Validation Results

| Check | Status |
|-------|--------|
| Lint | ✅ Pass |
| Unit Tests | ✅ 875 pass (40 new CLI tests) |
| E2E Tests | ✅ 16 pass |
| Build | ✅ Pass |
| CLI Build | ✅ Pass (248.6kb bundle) |
