---
name: implement-worktree
description: Implements a feature from a plan file in an isolated git worktree with e2e tests, parallel code review, and human review documentation. Use when implementing a planned feature with full validation and isolation.
user-invocable: true
---

# /implement-worktree Command

Implements a feature from a plan file in an isolated git worktree with full validation workflow.

## Usage

```
/implement-worktree <plan-file-path> [--phase <number>] [--base <branch>] [--reviewers <count>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `plan-file-path` | Yes | - | Path to the plan file in `.swarm/plans/` |
| `--phase` | No | Next incomplete | Specific phase number to implement |
| `--base` | No | `main` | Base branch for worktree creation |
| `--reviewers` | No | `3` | Number of parallel review agents |

### Examples

```bash
# Implement next incomplete phase from main
/implement-worktree .swarm/plans/2026-01-18-my-feature.md

# Implement specific phase
/implement-worktree .swarm/plans/2026-01-18-my-feature.md --phase 2

# Implement from dev branch with 5 reviewers
/implement-worktree .swarm/plans/2026-01-18-my-feature.md --base dev --reviewers 5
```

## Workflow

The command executes the following workflow:

### 1. Worktree Setup

#### Argument Parsing

Parse the command arguments:

```
Required:
  plan_file_path   - Path to plan file (e.g., .swarm/plans/2026-01-18-my-feature.md)

Optional:
  --phase <N>      - Specific phase number to implement (default: next incomplete)
  --base <branch>  - Base branch for worktree (default: main)
  --reviewers <N>  - Number of parallel review agents (default: 3)
```

#### Name Derivation

Derive worktree and branch names from the plan file:

```bash
# Extract plan name from file path
plan_file_path=".swarm/plans/2026-01-18-my-feature.md"
plan_name=$(basename "$plan_file_path" .md)
# Result: 2026-01-18-my-feature

# Derive branch name
branch_name="feature/$plan_name"
# Result: feature/2026-01-18-my-feature

# Derive worktree directory (sibling to current repo)
repo_name=$(basename "$(pwd)")
worktree_dir="../${repo_name}-${plan_name}"
# Result: ../civ-2026-01-18-my-feature
```

#### Pre-flight Validation

Before creating worktree, validate:

```bash
# 1. Verify plan file exists
if [[ ! -f "$plan_file_path" ]]; then
  echo "Error: Plan file not found: $plan_file_path"
  exit 1
fi

# 2. Verify plan status is "Ready for Implementation"
if ! grep -q "Status.*Ready for Implementation" "$plan_file_path"; then
  echo "Error: Plan status is not 'Ready for Implementation'"
  exit 1
fi

# 3. Verify base branch exists
if ! git rev-parse --verify "$base_branch" >/dev/null 2>&1; then
  echo "Error: Base branch does not exist: $base_branch"
  exit 1
fi

# 4. Check if branch already exists
if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
  echo "Error: Branch already exists: $branch_name"
  echo "Use existing worktree or delete branch first"
  exit 1
fi

# 5. Check if worktree directory already exists
if [[ -d "$worktree_dir" ]]; then
  echo "Error: Worktree directory already exists: $worktree_dir"
  exit 1
fi
```

#### Worktree Creation

```bash
# Create worktree with new branch from base
git worktree add -b "$branch_name" "$worktree_dir" "$base_branch"

# Verify worktree was created
if [[ ! -d "$worktree_dir" ]]; then
  echo "Error: Failed to create worktree"
  exit 1
fi

echo "Created worktree at: $worktree_dir"
echo "Created branch: $branch_name"
```

#### Dependency Installation

```bash
# Change to worktree directory
cd "$worktree_dir"

# Install dependencies for full isolation
npm install

# Verify installation succeeded
if [[ $? -ne 0 ]]; then
  echo "Error: npm install failed in worktree"
  echo "Check node_modules in source repo"
  exit 1
fi

echo "Dependencies installed in worktree"
```

#### Setup Summary

After successful setup, report:

```
Worktree Setup Complete
-----------------------
Plan File:    .swarm/plans/2026-01-18-my-feature.md
Worktree:     ../civ-2026-01-18-my-feature
Branch:       feature/2026-01-18-my-feature
Base Branch:  main
Phase:        <next incomplete or specified>
Reviewers:    3
```

#### Registry Integration (Post-Setup)

After successful worktree creation, update the workstream registry:

1. **Derive workstream ID** from plan file name:
   ```bash
   # .swarm/plans/2026-01-18-my-feature.md -> my-feature
   plan_name=$(basename "$plan_file_path" .md)
   workstream_id=$(echo "$plan_name" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
   ```

2. **Check if workstream exists** in `.swarm/workstreams.json`:
   - If exists: Update it
   - If not exists: Create new entry

3. **Update workstream state**:
   ```javascript
   workstream.state = "implementing";
   workstream.updated = new Date().toISOString();
   workstream.implementation = {
     branch: branch_name,
     worktree: worktree_dir,
     assignedInstance: process.env.CLAUDE_SESSION_ID || "unknown",
     currentPhase: target_phase,
     totalPhases: total_phases
   };
   workstream.artifacts.plan = plan_file_path;
   ```

4. **Write registry** using atomic update pattern:
   ```bash
   # Read, modify, write atomically
   cat .swarm/workstreams.json > /tmp/ws.json
   # (modify /tmp/ws.json)
   mv /tmp/ws.json .swarm/workstreams.json
   ```

5. **Report registry update**:
   ```
   Registry Updated: .swarm/workstreams.json
     Workstream: my-feature
     State: ready -> implementing
     Assigned to: <session-id>
   ```

### 2. Feature Implementation

#### Plan File Parsing

Parse the plan file to extract phases and tasks:

```markdown
# Expected Plan File Structure

## Phased Implementation

### Phase 1: Phase Name
- [ ] Task 1 description
- [ ] Task 2 description
- [x] Already completed task

### Phase 2: Another Phase
- [ ] Task A
- [ ] Task B
```

#### Phase Detection Algorithm

```
1. Read plan file content
2. Find all "### Phase N:" headers with regex: /^### Phase (\d+):/gm
3. For each phase:
   a. Extract phase number and name
   b. Find all checkbox lines until next phase header
   c. Parse checkbox state: [ ] = incomplete, [x] = complete
   d. Count incomplete tasks for each phase
4. Build phase list with task counts
```

#### Phase Selection Logic

```
If --phase argument provided:
  target_phase = specified phase number
  Validate phase exists in plan
Else:
  # Find first phase with unchecked tasks
  for each phase in order:
    if phase has unchecked tasks:
      target_phase = this phase
      break
  if no incomplete phases:
    Report "All phases complete"
    Exit
```

#### Task Extraction

For the target phase, extract all tasks:

```
phase_tasks = []
for each line in phase section:
  if line matches /^- \[([ x])\] (.+)$/:
    checkbox_state = match[1]  # ' ' or 'x'
    task_description = match[2]
    phase_tasks.push({
      description: task_description,
      completed: checkbox_state === 'x'
    })
```

#### Implementation Loop

For each incomplete task in the phase:

```
for task in phase_tasks where not task.completed:
  1. Analyze task description for:
     - Files to create/modify
     - Code patterns to implement
     - Integration points

  2. Read relevant source files:
     - Use Glob to find related files
     - Use Grep to find integration points
     - Read file contents to understand context

  3. Implement the change:
     - Use Edit for modifications
     - Use Write for new files
     - Follow existing code patterns

  4. Mark task complete in plan file:
     - Find: "- [ ] {task_description}"
     - Replace with: "- [x] {task_description}"

  5. Run quality checks:
     - npm run lint --fix
     - npm run format
```

#### Checkpoint Creation

After completing all tasks in a phase:

```
1. Create checkpoint file at:
   .swarm/checkpoints/YYYY-MM-DD-<plan-name>-phase-N.md

2. Include:
   - All completed tasks
   - Files modified with summaries
   - Test results (run incrementally during implementation)
   - Next steps for subsequent phases
   - Recovery notes if resuming later
```

#### Phase Completion Summary

After phase implementation:

```
Phase N Implementation Complete
-------------------------------
Tasks Completed: M
Files Created: X
Files Modified: Y

Lint: PASSED
Format: PASSED

Checkpoint saved to: .swarm/checkpoints/YYYY-MM-DD-<plan-name>-phase-N.md

Next: Phase N+1 has K remaining tasks
```

#### Registry Integration (Phase Complete)

After each phase completes, update the workstream registry:

1. **Update phase progress**:
   ```javascript
   workstream.implementation.currentPhase = completed_phase;
   workstream.updated = new Date().toISOString();
   ```

2. **Link checkpoint artifact**:
   ```javascript
   workstream.artifacts.checkpoints.push(checkpoint_path);
   ```

3. **Report update**:
   ```
   Registry Updated: Phase N complete
     Workstream: my-feature
     Progress: Phase N/M
   ```

### 3. E2E Test Generation

#### Feature Analysis

Before generating tests, analyze the implemented feature:

```
1. Identify changed files:
   - git diff --name-only <base-branch>...HEAD

2. Categorize changes:
   - UI components (renders something visible)
   - User interactions (responds to input)
   - Data processing (transforms state)
   - API calls (fetches/sends data)

3. Determine test scope:
   - What user-visible behavior changed?
   - What error conditions should be handled?
   - What visual elements should be verified?
```

#### Test File Location

```
tests/e2e/<feature-name>.spec.ts
```

Example: For plan `2026-01-18-map-zoom.md`, create `tests/e2e/map-zoom.spec.ts`

#### Test Categories

Generate tests in these categories:

**1. Smoke Tests (Page Loads)**
```typescript
test('page loads without errors', async ({ page }) => {
  await page.goto('/');

  // Wait for app initialization
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Verify no console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  expect(errors).toHaveLength(0);
});
```

**2. Visual Regression Tests**
```typescript
test('feature renders correctly', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Capture initial state
  await expect(page).toHaveScreenshot('feature-initial.png', {
    maxDiffPixels: 100,
  });
});

test('feature after interaction renders correctly', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');

  // Perform interaction
  await page.click('canvas');
  await page.waitForTimeout(500);

  // Capture after interaction
  await expect(page).toHaveScreenshot('feature-after-click.png', {
    maxDiffPixels: 100,
  });
});
```

**3. User Interaction Tests**
```typescript
test('user can perform action', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');

  // Get initial state
  const initialState = await page.evaluate(() => {
    // Access game state from window
    return (window as any).gameState?.someValue;
  });

  // Perform interaction
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(100);

  // Verify state changed
  const newState = await page.evaluate(() => {
    return (window as any).gameState?.someValue;
  });

  expect(newState).not.toBe(initialState);
});
```

**4. Error Handling Tests**
```typescript
test('handles invalid input gracefully', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');

  // Attempt invalid action
  await page.keyboard.press('InvalidKey');

  // Verify app still works
  const canvas = await page.locator('canvas');
  await expect(canvas).toBeVisible();
});
```

#### Complete Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: [Feature Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);
  });

  test.describe('Smoke Tests', () => {
    test('page loads without errors', async ({ page }) => {
      const canvas = await page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('initial render', async ({ page }) => {
      await expect(page).toHaveScreenshot('feature-initial.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('User Interactions', () => {
    test('responds to user input', async ({ page }) => {
      // Specific interaction tests
    });
  });

  test.describe('Error Handling', () => {
    test('handles edge cases', async ({ page }) => {
      // Error condition tests
    });
  });
});
```

#### Test Generation Summary

After generating tests:

```
E2E Tests Generated
-------------------
File: tests/e2e/<feature-name>.spec.ts

Tests Created:
  - Smoke: N tests
  - Visual: N screenshots
  - Interaction: N tests
  - Error: N tests

Total: N tests
```

### 4. Initial Validation

#### Validation Commands

Run all tests to verify implementation:

```bash
# 1. Unit tests
npm run test
# Expected: All tests pass

# 2. E2E tests (Playwright)
npm run test:e2e
# Expected: All tests pass, screenshots match

# 3. Linting
npm run lint
# Expected: No errors

# 4. Build verification
npm run build
# Expected: Build succeeds without errors
```

#### Validation Execution

```
1. Run unit tests:
   result = npm run test
   if result.exitCode !== 0:
     FAIL - Create partial checkpoint
     Report: "Unit tests failed"
     STOP - Do not proceed

2. Run e2e tests:
   result = npm run test:e2e
   if result.exitCode !== 0:
     FAIL - Create partial checkpoint
     Report: "E2E tests failed"
     STOP - Do not proceed

3. Run lint:
   result = npm run lint
   if result.exitCode !== 0:
     FAIL - Create partial checkpoint
     Report: "Linting failed"
     STOP - Do not proceed

4. Run build:
   result = npm run build
   if result.exitCode !== 0:
     FAIL - Create partial checkpoint
     Report: "Build failed"
     STOP - Do not proceed
```

#### Checkpoint Creation

After all validations pass, create checkpoint:

```
File: .swarm/checkpoints/YYYY-MM-DD-<plan-name>-phase-N.md
```

Include:

```markdown
# Checkpoint: [Feature] - Phase [N]

**Date**: YYYY-MM-DD HH:MM
**Feature**: [Feature name]
**Phase**: [Phase N of M]
**Status**: Complete

## Completed Tasks
- [x] Task 1
- [x] Task 2

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| path/to/file | Create/Modify | What changed |

## Test Results
- Unit Tests: X passed, Y failed
- E2E Tests: X passed, Y failed
- Lint: PASSED | FAILED
- Build: PASSED | FAILED

## Next Steps
What remains to be done

## Recovery Notes
Information needed if resuming from this checkpoint
```

#### Fail Fast Behavior

**CRITICAL**: If any test fails:

1. Do NOT proceed to code simplification
2. Create checkpoint with `Status: Failed`
3. Report failure clearly:

```
VALIDATION FAILED
-----------------
Phase: N
Step: [unit tests | e2e tests | lint | build]
Error: [error message]

Action Required:
  Fix the failing tests before continuing.
  Resume with: /implement-worktree <plan> --phase N

Checkpoint saved to: .swarm/checkpoints/YYYY-MM-DD-<plan-name>-phase-N.md
```

#### Validation Summary

On success:

```
VALIDATION PASSED
-----------------
Phase: N
Unit Tests: X passed
E2E Tests: Y passed
Lint: PASSED
Build: PASSED

Proceeding to code simplification...
```

### 5. Code Simplification

#### Plugin-Assisted Simplification

If the code-simplifier plugin is available, invoke it first for automated complexity analysis:

1. **Identify changed source files**:
   ```bash
   changed_files=$(git diff --name-only <base-branch>...HEAD | grep -E '\.(ts|tsx)$')
   ```

2. **Invoke code-simplifier plugin**:
   For each file in changed_files:
   - Request complexity analysis
   - Request redundancy detection
   - Request consolidation suggestions

3. **Process plugin findings**:
   ```
   for each finding:
     if finding.type == "redundant_code":
       Apply removal automatically
     elif finding.type == "complexity_reduction":
       if complexity_score > threshold:
         Apply simplification
       else:
         Add to manual review
     elif finding.type == "consolidation":
       Add to manual review (may affect architecture)
   ```

4. **Continue with manual checklist** below for remaining items not covered by the plugin

**Fallback**: If the code-simplifier plugin is unavailable, proceed directly to the manual identification and checklist below.

#### Identify Changed Files

```bash
# Get list of all modified files since branch creation
git diff --name-only <base-branch>...HEAD

# Filter to source files only
git diff --name-only <base-branch>...HEAD | grep -E '\.(ts|tsx|js|jsx)$'
```

#### Simplification Checklist (Manual Fallback)

For each changed file, review and apply these simplifications:

**1. Remove Unnecessary Complexity**
```
- Replace complex conditionals with early returns
- Simplify nested loops with built-in methods (map, filter, reduce)
- Extract complex expressions into named variables
- Remove dead code and unused imports
```

**2. Consolidate Duplicate Logic**
```
- Identify repeated code patterns
- Extract common logic into helper functions
- Create utility functions for reused operations
- Consider creating shared types or interfaces
```

**3. Improve Variable/Function Naming**
```
- Use descriptive names that explain purpose
- Follow naming conventions (camelCase for variables, PascalCase for types)
- Rename cryptic abbreviations to full words
- Ensure function names describe what they do, not how
```

**4. Add Missing Documentation**
```
- Add JSDoc comments to exported functions
- Document complex algorithms with inline comments
- Add type descriptions for non-obvious types
- Document edge cases and assumptions
```

#### Simplification Process

```
for each changed_file in source_files:
  1. Read file content
  2. Analyze for simplification opportunities:
     - Cyclomatic complexity > 10? Consider refactoring
     - Duplicate code blocks? Extract to function
     - Magic numbers? Create named constants
     - Unclear names? Rename for clarity
  3. Apply safe refactorings:
     - Only changes that preserve behavior
     - No new features or bug fixes
     - No architectural changes
  4. Run lint to verify:
     - npm run lint --fix
  5. Run tests to verify:
     - npm run test
     - If tests fail, revert simplification
```

#### Documentation Template

For functions lacking documentation:

```typescript
/**
 * Brief description of what the function does.
 *
 * @param paramName - Description of the parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = functionName(arg);
 * ```
 */
```

#### Quality Checks After Simplification

```bash
# Run lint with auto-fix
npm run lint -- --fix

# Run formatter
npm run format

# Verify tests still pass
npm run test
```

#### Simplification Summary

```
Code Simplification Complete
----------------------------
Files Reviewed: N
Files Modified: M

Plugin Analysis (if available):
  - Plugin used: code-simplifier
  - Files analyzed: X
  - Simplifications applied: Y
  - Deferred to manual review: Z

Manual Changes Made:
  - Complexity reduced: X functions
  - Duplicates consolidated: Y locations
  - Names improved: Z identifiers
  - Documentation added: W functions

Lint: PASSED
Format: Applied
Tests: PASSED
```

### 6. Parallel Code Review

#### code-review Plugin (Primary Review)

The code-review plugin should be invoked first as the primary review mechanism:

1. **Invocation**:
   Invoke code-review plugin with:
   - List of changed files from `git diff --name-only <base-branch>...HEAD`
   - Reference to CLAUDE.md for compliance checking
   - Base branch for context

2. **Plugin Agents**:
   The plugin runs 4 parallel internal agents:
   - Guideline compliance checker (CLAUDE.md adherence)
   - Bug scanner (obvious bugs and anti-patterns)
   - Git history analyzer (contextual review)
   - Code quality reviewer (general quality checks)

3. **Processing Results**:
   Plugin findings are prioritized by confidence score:
   - **80+**: Critical, apply automatically
   - **50-79**: Major, flag for review
   - **<50**: Minor, document only

4. **Findings Integration**:
   | Source | Focus Area | Priority |
   |--------|-----------|----------|
   | code-review plugin | CLAUDE.md compliance, obvious bugs, git history | High |
   | Custom Logic Agent | Algorithm correctness, edge cases | Medium |
   | Custom Style Agent | Naming, organization, DRY | Medium |
   | Custom Performance Agent | Complexity, PixiJS, memory | Medium |

5. **Integration with Custom Agents**:
   After plugin review completes, run custom agents to cover areas not addressed by the plugin.

**Fallback**: If the code-review plugin is unavailable, proceed directly to custom review agents below.

#### Configurable Reviewer Count

The number of custom review agents is configurable via the `--reviewers` argument:

```
Default: 3 reviewers
Minimum: 1 reviewer
Maximum: 5 reviewers (to avoid context overload)
```

#### Custom Review Agent Definitions

**Agent 1 - Logic Review:**

Focus areas:
- Algorithm correctness
- Edge case handling
- Error handling completeness
- Type safety
- Null/undefined handling
- Async/await correctness

Prompt template:
```
You are a Logic Reviewer. Analyze the changed files for correctness issues.

Focus on:
1. Algorithm correctness - Does the logic do what it claims?
2. Edge cases - What happens with empty arrays, null values, boundaries?
3. Error handling - Are errors caught and handled appropriately?
4. Type safety - Are types used correctly throughout?

For each issue found, report:
- File: <path>
- Line: <number>
- Issue: <description>
- Suggested Fix: <code or description>
- Severity: critical | major | minor

Critical = will cause crashes or data loss
Major = incorrect behavior in common cases
Minor = edge cases or code smell
```

**Agent 2 - Style Review:**

Focus areas:
- Naming conventions
- Code organization
- Documentation completeness
- DRY violations
- Consistent patterns

Prompt template:
```
You are a Style Reviewer. Analyze the changed files for style and organization issues.

Focus on:
1. Naming - Are names descriptive and consistent?
2. Organization - Is code logically structured?
3. Documentation - Are public APIs documented?
4. DRY - Is there duplicated code that should be extracted?

For each issue found, report:
- File: <path>
- Line: <number>
- Issue: <description>
- Suggested Improvement: <description>
- Severity: major | minor

Major = significantly impacts readability
Minor = minor style preference
```

**Agent 3 - Performance Review:**

Focus areas:
- Algorithm complexity
- Memory allocation
- PixiJS best practices
- Memory leaks
- Test coverage

Prompt template:
```
You are a Performance Reviewer. Analyze the changed files for performance issues.

Focus on:
1. Complexity - Any O(n^2) or worse algorithms in hot paths?
2. Allocations - Unnecessary object creation in loops?
3. PixiJS - Following PixiJS best practices for rendering?
4. Memory - Potential memory leaks (missing cleanup)?
5. Tests - Are critical paths covered by tests?

For each issue found, report:
- File: <path>
- Line: <number>
- Issue: <description>
- Performance Impact: high | medium | low
- Suggested Optimization: <description>
- Severity: critical | major | minor
```

#### Launching Parallel Reviews

```
1. Prepare changed files list:
   changed_files = git diff --name-only <base-branch>...HEAD

2. Launch Task agents in parallel:
   results = await Promise.all([
     Task(LogicReviewAgent, changed_files),
     Task(StyleReviewAgent, changed_files),
     Task(PerformanceReviewAgent, changed_files),
   ])

3. Wait for all agents to complete
4. Collect findings from each agent
```

#### Aggregating Findings

Combine all findings (plugin and custom agents) into a unified report with source attribution:

```markdown
# Code Review Findings

## Critical Issues (must fix)
| File | Line | Source | Issue | Confidence | Suggested Fix |
|------|------|--------|-------|------------|---------------|
| path/file.ts | 42 | code-review plugin | Description | 95 | Fix suggestion |
| path/file.ts | 88 | Logic Agent | Description | N/A | Fix suggestion |

## Major Issues (should fix)
| File | Line | Source | Issue | Confidence | Suggested Fix |
|------|------|--------|-------|------------|---------------|

## Minor Issues (nice to fix)
| File | Line | Source | Issue | Confidence | Suggested Fix |
|------|------|--------|-------|------------|---------------|
```

**Source Attribution Key**:
- `code-review plugin` - Finding from the code-review plugin (includes confidence score)
- `Logic Agent` - Finding from custom Logic Review agent
- `Style Agent` - Finding from custom Style Review agent
- `Performance Agent` - Finding from custom Performance Review agent

#### Applying Improvements

**Non-controversial (apply automatically):**
- Fixing obvious typos
- Adding missing documentation
- Removing unused imports
- Fixing linting errors
- Simple refactorings with clear benefits

**Controversial (document for human review):**
- Algorithm changes
- Architectural decisions
- Trade-offs (performance vs readability)
- Changes that might affect behavior
- Style preferences without clear consensus

#### Review Application Process

```
for each finding in aggregated_findings:
  # Confidence-based application (plugin findings)
  if finding.source == "code-review plugin":
    if finding.confidence >= 80:
      Apply fix automatically
      Mark as "auto-applied (high confidence)"
    elif finding.confidence >= 50:
      Add to human review list
      Mark as "for human review (medium confidence)"
    else:
      Document only
      Mark as "documented (low confidence)"

  # Severity-based application (custom agent findings)
  elif finding.severity == "critical":
    Apply fix immediately
    Mark as applied
  elif finding.is_non_controversial:
    Apply fix
    Mark as applied
  else:
    Add to human review list
    Mark as "for human review"
```

#### Review Summary

```
Code Review Complete
--------------------
Plugin Review (code-review):
  - Findings: X total
  - Auto-Applied (confidence >= 80): Y
  - For Review (confidence 50-79): Z
  - Documented (confidence < 50): W

Custom Agent Review:
  - Reviewers: N agents
  - Findings: X total

Combined Results by Severity:
  - Critical: A (all applied)
  - Major: B (C applied, D for human review)
  - Minor: E (F applied, G for human review)

Total Auto-Applied: X fixes
For Human Review: Y items (see .swarm/reviews/)
```

#### pr-review-toolkit Specialized Analysis

After aggregating code review findings, invoke pr-review-toolkit agents for comprehensive pre-PR analysis:

1. **pr-test-analyzer**:
   Analyze test coverage for changed files.
   - Input: List of changed files, test directories (`tests/`, `src/**/*.test.ts`)
   - Output: Coverage percentage, uncovered lines, missing test scenarios
   - **Quality Gate**: Warn if coverage < 80% for changed code

2. **type-design-analyzer**:
   Rate TypeScript type quality on a 1-10 scale.
   - Input: Changed TypeScript files
   - Output: Score 1-10, specific type issues, improvement suggestions
   - Checks: `any` types, type assertions, proper generics usage
   - **Quality Gate**: Warn if score < 7

3. **silent-failure-hunter**:
   Detect error handling gaps.
   - Input: Changed files
   - Output: Missing try/catch, swallowed errors, unhandled promise rejections
   - Checks: Async/await error propagation, empty catch blocks
   - **Quality Gate**: Block if critical findings (missing error handling in critical paths)

4. **comment-analyzer**:
   Verify documentation accuracy.
   - Input: Changed files with JSDoc
   - Output: Accuracy percentage, outdated comments, missing documentation
   - Checks: JSDoc matches function signatures, exported functions documented
   - **Quality Gate**: Warn if accuracy < 90%

#### Quality Gate Enforcement

Before proceeding to re-validation, evaluate quality gates:

```
Quality Gate Summary
-------------------
| Agent                   | Score/Status     | Threshold    | Status    |
|-------------------------|------------------|--------------|-----------|
| pr-test-analyzer        | X% coverage      | >= 80%       | PASS/WARN |
| type-design-analyzer    | N/10             | >= 7         | PASS/WARN |
| silent-failure-hunter   | N critical       | 0 critical   | PASS/BLOCK|
| comment-analyzer        | X% accuracy      | >= 90%       | PASS/WARN |

Overall Status: PASS / WARN / BLOCKED

If BLOCKED:
  - Fix critical silent-failure-hunter findings before proceeding
  - These represent potential runtime failures

If WARN:
  - Document warnings in human review
  - Proceed with caution, may require attention before merge
```

**Fallback**: If pr-review-toolkit is unavailable, proceed directly to re-validation with a note that specialized analysis was skipped.

### 7. Re-validation

#### Full Test Suite

Run all tests again after code simplification and review fixes:

```bash
# Run all validation steps
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run lint        # Linting
npm run build       # Build verification
```

#### Success Criteria Verification

Read the plan file and verify each success criterion:

```
1. Extract success criteria from plan file:
   - Find "## Success Criteria" section
   - Parse each checkbox item

2. For each criterion:
   - Determine how to verify (manual check, test result, file exists)
   - Execute verification
   - Record result: PASS | FAIL
   - Collect evidence (test output, screenshot, file path)
```

#### Validation Document

Create validation document at `.swarm/validations/YYYY-MM-DD-<feature>.md`:

```markdown
# Validation: [Feature Name]

**Date**: YYYY-MM-DD
**Plan**: .swarm/plans/YYYY-MM-DD-<feature>.md
**Branch**: feature/<feature>
**Status**: PASSED | FAILED

## Test Results

### Unit Tests
- Run command: `npm run test`
- Tests run: N
- Passed: N
- Failed: N
- Status: PASSED | FAILED

### E2E Tests
- Run command: `npm run test:e2e`
- Tests run: N
- Passed: N
- Failed: N
- Status: PASSED | FAILED

### Linting
- Run command: `npm run lint`
- Errors: N
- Warnings: N
- Status: PASSED | FAILED

### Build
- Run command: `npm run build`
- Status: PASSED | FAILED

## Success Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Criterion from plan | PASS | How verified |
| 2 | Another criterion | PASS | Evidence |
| 3 | Failed criterion | FAIL | What went wrong |

## Criteria Details

### Criterion 1: [Name]
**Status**: PASS
**Verification Method**: [How it was verified]
**Evidence**: [Test output, file path, or description]

### Criterion 2: [Name]
**Status**: FAIL
**Verification Method**: [How it was attempted]
**Failure Reason**: [What went wrong]
**Remediation**: [What needs to be done]

## Plugin Analysis Summary

### Code Simplifier Results
- Files Analyzed: N
- Simplifications Applied: M
- Deferred to Manual Review: K

### Code Review Plugin Results
- Total Findings: X
- Auto-Applied (confidence >= 80): Y
- Flagged for Review (confidence 50-79): Z
- Documented (confidence < 50): W

### PR Review Toolkit Results

| Agent | Score/Result | Quality Gate | Status |
|-------|-------------|--------------|--------|
| pr-test-analyzer | X% coverage | >= 80% | PASS/WARN |
| type-design-analyzer | N/10 | >= 7 | PASS/WARN |
| silent-failure-hunter | N critical | 0 | PASS/BLOCK |
| comment-analyzer | X% accurate | >= 90% | PASS/WARN |

### Plugin Assessment
**Overall Status**: PASS / NEEDS ATTENTION

If NEEDS ATTENTION:
- List quality gate failures/warnings
- Required remediation steps

## Overall Verdict

**Status**: PASSED | FAILED

If PASSED:
- All tests pass
- All success criteria verified
- Plugin quality gates passed or warnings acceptable
- Ready for human review

If FAILED:
- List failing items
- Required actions to fix
- Do not proceed to human review until resolved
```

#### Re-validation Flow

```
1. Run full test suite
   if any test fails:
     Create validation doc with FAILED status
     STOP - Report failure
     Return

2. Parse success criteria from plan
   for each criterion:
     verify_result = verify(criterion)
     if verify_result.failed:
       mark_failed = true

3. Create validation document
   if mark_failed:
     status = FAILED
     STOP - Report failures
   else:
     status = PASSED
     Proceed to human review documentation
```

#### Re-validation Summary

```
RE-VALIDATION COMPLETE
----------------------
Status: PASSED | FAILED

Test Results:
  Unit Tests: X passed
  E2E Tests: Y passed
  Lint: PASSED
  Build: PASSED

Success Criteria: N of M verified

Validation document: .swarm/validations/YYYY-MM-DD-<feature>.md
```

### 8. Human Review Documentation

#### Directory Setup

Ensure reviews directory exists:

```bash
mkdir -p .swarm/reviews
```

#### Gathering Information

Collect information for the review document:

```bash
# Get list of changed files with line counts
git diff --stat <base-branch>...HEAD

# Get detailed change summary
git diff --shortstat <base-branch>...HEAD

# Count tests
npm run test -- --reporter=json 2>/dev/null | jq '.numTotalTests'

# Get commit history for this feature
git log --oneline <base-branch>...HEAD
```

#### Review Document Creation

Create review document at `.swarm/reviews/YYYY-MM-DD-<feature>.md`:

```markdown
# Human Review: [Feature Name]

**Date**: YYYY-MM-DD
**Branch**: feature/feature-name
**Worktree**: ../civ-feature-name
**Plan**: .swarm/plans/YYYY-MM-DD-feature-name.md
**Validation**: .swarm/validations/YYYY-MM-DD-feature-name.md

## Summary

[1-2 paragraph description of what was implemented and why]

## Changes Overview

| File | Lines Added | Lines Removed | Description |
|------|-------------|---------------|-------------|
| src/feature/File.ts | +100 | -20 | Main feature implementation |
| src/feature/Helper.ts | +50 | -0 | Helper utilities |
| tests/e2e/feature.spec.ts | +80 | -0 | E2E tests |

**Total**: X files changed, Y insertions(+), Z deletions(-)

## Key Decisions

### Decision 1: [Title]
**Context**: Why was a decision needed?
**Options Considered**:
- Option A: Description
- Option B: Description
**Chosen**: Option A
**Rationale**: Why this option was selected

### Decision 2: [Title]
...

## Trade-offs

| Trade-off | Benefit | Cost | Decision |
|-----------|---------|------|----------|
| Performance vs Readability | Clearer code | Slightly slower | Chose readability |
| Feature scope | Ship faster | Missing edge case | Deferred to v2 |

## Testing Coverage

### Unit Tests
- Total tests: N
- New tests added: M
- Coverage areas:
  - Core logic: X tests
  - Edge cases: Y tests
  - Error handling: Z tests

### E2E Tests
- Total scenarios: N
- New scenarios: M
- Coverage areas:
  - User flows: X scenarios
  - Error states: Y scenarios

### Visual Regression
- Screenshots captured: N
- Baseline images: [list if applicable]

## Items for Human Review

### From Code Review Agents
[List controversial items that were flagged during parallel code review]

| Item | Agent | Recommendation | Notes |
|------|-------|----------------|-------|
| Algorithm choice | Logic | Consider alternative | See line X |
| Naming convention | Style | Consider rename | Subjective preference |

### Plugin Analysis Summary

#### Code Simplifier
Simplification opportunities identified by the code-simplifier plugin:

| File | Suggestion | Impact | Status |
|------|-----------|--------|--------|
| path/file.ts | Description | High/Med/Low | Applied/Deferred |

#### Code Review Plugin
Findings from the code-review plugin (confidence < 80, requiring human judgment):

| File | Line | Finding | Confidence | Recommendation |
|------|------|---------|------------|----------------|
| path/file.ts | 42 | Description | 65 | Suggested action |

#### PR Review Toolkit Quality Scores

| Agent | Score | Threshold | Notes |
|-------|-------|-----------|-------|
| Test Coverage | X% | 80% | [Details if below threshold] |
| Type Design | N/10 | 7 | [Specific type issues] |
| Error Handling | N findings | 0 | [List critical findings] |
| Documentation | X% | 90% | [Missing docs] |

### Additional Considerations
- [ ] Any security implications?
- [ ] Any performance concerns at scale?
- [ ] Any accessibility issues?
- [ ] Any plugin warnings that need addressing?

## Review Checklist for Humans

### Business Logic
- [ ] Feature behaves as specified in plan
- [ ] Edge cases are handled correctly
- [ ] Error messages are user-friendly

### User Experience
- [ ] Visual appearance matches expectations
- [ ] Interactions feel responsive
- [ ] No jarring transitions or glitches

### Performance
- [ ] No noticeable lag on target hardware
- [ ] Memory usage is reasonable
- [ ] No performance regression in existing features

### Security
- [ ] No sensitive data exposed
- [ ] Input validation is adequate
- [ ] No injection vulnerabilities

### Code Quality
- [ ] Code is understandable
- [ ] Tests cover critical paths
- [ ] Documentation is adequate

## How to Test Locally

```bash
# Navigate to worktree
cd ../civ-feature-name

# Install dependencies (already done, but just in case)
npm install

# Run development server
npm run dev

# In another terminal, run tests
npm run test
npm run test:e2e
```

### Manual Testing Steps

1. Open browser to http://localhost:5173
2. [Step-by-step testing instructions]
3. Verify [expected behavior]

## Merge Instructions

After review approval:

```bash
# From main repository
cd /path/to/civ

# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/feature-name

# Push to remote
git push origin main

# Clean up worktree (manual)
git worktree remove ../civ-feature-name

# Delete branch if no longer needed
git branch -d feature/feature-name
```

## Related Documents

- Plan: `.swarm/plans/YYYY-MM-DD-feature-name.md`
- Validation: `.swarm/validations/YYYY-MM-DD-feature-name.md`
- Checkpoints: `.swarm/checkpoints/YYYY-MM-DD-feature-name-phase-*.md`
```

#### Review Document Summary

After creating the review document:

```
HUMAN REVIEW DOCUMENT CREATED
-----------------------------
Location: .swarm/reviews/YYYY-MM-DD-<feature>.md

Contains:
  - Summary of implementation
  - Changed files overview (N files)
  - Key decisions (M decisions)
  - Trade-offs considered
  - Testing coverage
  - Human review checklist
  - Local testing instructions
  - Merge instructions

Ready for human review.
```

### 9. PR or Manual Completion

#### User Prompt

Ask the user how they want to complete the implementation:

```
IMPLEMENTATION COMPLETE
-----------------------
The feature has been implemented, validated, and documented.

How would you like to proceed?

1. Create Pull Request (requires gh CLI)
   - Push branch to remote
   - Create PR with review document as body

2. Manual Completion
   - Print worktree location
   - Print review document path
   - Leave for manual handling

Enter choice (1 or 2):
```

#### Option 1: Create Pull Request

If the user chooses PR creation:

```bash
# Verify gh CLI is available
if ! command -v gh &> /dev/null; then
  echo "Error: gh CLI not installed"
  echo "Install: https://cli.github.com/"
  echo "Falling back to manual completion..."
  # Fall back to Option 2
fi

# Verify authenticated
if ! gh auth status &> /dev/null; then
  echo "Error: gh CLI not authenticated"
  echo "Run: gh auth login"
  echo "Falling back to manual completion..."
  # Fall back to Option 2
fi

# Push branch to remote
git push -u origin "$branch_name"

# Create PR with review document as body
# The review document includes the plugin quality gate summary
gh pr create \
  --title "Feature: $feature_name" \
  --body-file ".swarm/reviews/YYYY-MM-DD-$plan_name.md"
```

**Note**: The PR body (from the review document) includes the Plugin Analysis Summary with quality gate results. If any quality gates are in WARN or BLOCK status, this will be visible in the PR description for reviewers.

PR creation summary:

```
PULL REQUEST CREATED
--------------------
Branch: feature/feature-name
PR URL: https://github.com/owner/repo/pull/123

Review Document: .swarm/reviews/YYYY-MM-DD-feature-name.md
Worktree: ../civ-feature-name

Next Steps:
1. Review the PR on GitHub
2. Request reviews from team members
3. After merge, clean up worktree:
   git worktree remove ../civ-feature-name
```

#### Option 2: Manual Completion

If the user chooses manual handling:

```
MANUAL COMPLETION
-----------------
The implementation is ready for manual review and merging.

Worktree Location: ../civ-feature-name
Branch: feature/feature-name

Review Document: .swarm/reviews/YYYY-MM-DD-feature-name.md
Validation: .swarm/validations/YYYY-MM-DD-feature-name.md

To create PR manually:
  cd ../civ-feature-name
  git push -u origin feature/feature-name
  gh pr create --title "Feature: feature-name" --body-file ".swarm/reviews/YYYY-MM-DD-feature-name.md"

To merge directly:
  git checkout main
  git merge feature/feature-name

Worktree Cleanup (after merge):
  git worktree remove ../civ-feature-name
  git branch -d feature/feature-name
```

#### Worktree Cleanup Notice

Always remind the user about manual cleanup:

```
IMPORTANT: Worktree Cleanup
---------------------------
Worktree cleanup is manual. After you're done with the feature:

# Remove the worktree
git worktree remove ../civ-feature-name

# Or force remove if there are uncommitted changes
git worktree remove --force ../civ-feature-name

# Delete the branch if no longer needed
git branch -d feature/feature-name

# List all worktrees to verify
git worktree list
```

#### Completion Summary

Final output:

```
/implement-worktree COMPLETE
============================
Feature: [Feature Name]
Plan: .swarm/plans/YYYY-MM-DD-feature-name.md

Artifacts Created:
  - Worktree: ../civ-feature-name
  - Branch: feature/feature-name
  - Validation: .swarm/validations/YYYY-MM-DD-feature-name.md
  - Review Doc: .swarm/reviews/YYYY-MM-DD-feature-name.md
  - Checkpoints: .swarm/checkpoints/YYYY-MM-DD-feature-name-phase-*.md

Status: Ready for human review
PR: [Created | Manual]

Thank you for using /implement-worktree!
```

## Checkpoint Format

After each phase, create checkpoint at `.swarm/checkpoints/YYYY-MM-DD-<feature>-phase-N.md`:

```markdown
# Checkpoint: [Feature] - Phase [N]

**Date**: YYYY-MM-DD HH:MM
**Feature**: [Feature name]
**Phase**: [Phase N of M]
**Status**: Complete | Partial | Failed

## Completed Tasks
- [x] Task 1
- [x] Task 2

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| path/to/file | Create/Modify/Delete | What changed |

## Test Results
- Tests run: X
- Passed: Y
- Failed: Z

## Next Steps
What remains to be done

## Recovery Notes
Information needed if resuming from this checkpoint
```

## Validation Document Format

```markdown
# Validation: [Feature Name]

**Date**: YYYY-MM-DD
**Status**: PASSED | FAILED

## Success Criteria Verification
| Criterion | Status | Evidence |
|-----------|--------|----------|
| Criterion 1 | PASS | Evidence |

## Test Results
- Tests Run: N
- Passed: N
- Failed: N

## Overall Verdict: PASSED | FAILED
```

## Error Handling

### Worktree Creation Failures

If worktree creation fails:

```bash
# Check if branch already exists
git branch --list "feature/$plan_name"

# Check if worktree path is already in use
git worktree list

# Check for stale worktree references
git worktree prune
```

Error messages and resolutions:

| Error | Cause | Resolution |
|-------|-------|------------|
| "fatal: '$branch_name' is already checked out" | Branch exists in another worktree | Use existing worktree or remove it first |
| "fatal: '$worktree_dir' already exists" | Directory exists | Remove directory or use different name |
| "fatal: invalid reference: $base_branch" | Base branch doesn't exist | Fetch from remote or use different base |
| "fatal: A branch named '$branch_name' already exists" | Branch exists | Delete branch or use different name |

Recovery:

```
WORKTREE CREATION FAILED
------------------------
Error: [specific error message]

Possible resolutions:
1. Remove existing worktree: git worktree remove <path>
2. Delete existing branch: git branch -D <branch>
3. Clean stale references: git worktree prune

After resolution, retry:
  /implement-worktree <plan-file>
```

### npm install Failures

If npm install fails:

```bash
# Check node/npm versions
node --version
npm --version

# Clear npm cache
npm cache clean --force

# Try with legacy peer deps (if peer dependency issues)
npm install --legacy-peer-deps
```

Error messages and resolutions:

| Error | Cause | Resolution |
|-------|-------|------------|
| ENOENT | Missing package.json | Verify worktree was created correctly |
| ERESOLVE | Peer dependency conflict | Use --legacy-peer-deps |
| EACCES | Permission denied | Check file permissions |
| Network errors | No internet / registry down | Check connection, retry later |

Recovery:

```
NPM INSTALL FAILED
------------------
Error: [specific error message]

Worktree: ../civ-feature-name

To retry manually:
  cd ../civ-feature-name
  npm install

After successful install, resume:
  /implement-worktree <plan-file> --phase N
```

### Test Failures

If tests fail during validation:

```
TEST FAILURE
------------
Phase: N
Step: [unit tests | e2e tests | lint | build]

Failed Tests:
  - test/path/file.test.ts: Test name
    Error: Expected X but got Y

Checkpoint: .swarm/checkpoints/YYYY-MM-DD-<feature>-phase-N.md
Status: Failed

IMPORTANT: Implementation halted. Fix failing tests before continuing.

To debug:
  cd ../civ-feature-name
  npm run test -- --reporter=verbose

After fixes, resume:
  /implement-worktree <plan-file> --phase N
```

Test failure handling:

1. Create partial checkpoint with `Status: Failed`
2. Include specific test failures in checkpoint
3. Do NOT proceed to next workflow step
4. Require user intervention before continuing

### Checkpoint Recovery

#### Finding Latest Checkpoint

```bash
# List all checkpoints for this feature
ls -la .swarm/checkpoints/*-<feature>-*.md | sort

# Find most recent
ls -t .swarm/checkpoints/*-<feature>-*.md | head -1
```

#### Recovery Process

```
1. Identify latest checkpoint:
   checkpoint = find_latest(".swarm/checkpoints/*-<feature>-*.md")

2. Read checkpoint:
   - Current phase number
   - Status (Complete | Partial | Failed)
   - Completed tasks
   - Next steps

3. Determine resume point:
   if status == Complete:
     resume_phase = checkpoint.phase + 1
   elif status == Partial or Failed:
     resume_phase = checkpoint.phase
     # Re-attempt from first incomplete task

4. Resume implementation:
   /implement-worktree <plan-file> --phase <resume_phase>
```

#### Recovery Summary

```
CHECKPOINT RECOVERY
-------------------
Latest Checkpoint: .swarm/checkpoints/YYYY-MM-DD-<feature>-phase-N.md
Checkpoint Status: [Complete | Partial | Failed]
Last Completed Phase: N

Recovery Action:
  [Resuming Phase N+1 | Re-attempting Phase N]

Checkpoint Contents:
  - Completed: X tasks
  - Remaining: Y tasks
  - Files modified: Z files

To resume:
  /implement-worktree <plan-file> --phase <M>
```

### General Error Recovery

For any unhandled error:

```
UNEXPECTED ERROR
----------------
Error Type: [error type]
Message: [error message]
Location: [file/line if available]

Worktree: ../civ-feature-name
Last Checkpoint: .swarm/checkpoints/...

Recovery Steps:
1. Check the worktree is intact: ls ../civ-feature-name
2. Check git status: cd ../civ-feature-name && git status
3. Review last checkpoint for context
4. Fix any issues manually
5. Resume: /implement-worktree <plan-file> --phase N

If worktree is corrupted:
1. Remove: git worktree remove --force ../civ-feature-name
2. Delete branch: git branch -D feature/<feature>
3. Start fresh: /implement-worktree <plan-file>
```

### Pre-flight Checks

Run these checks before starting to avoid common errors:

```bash
# Verify git is clean in main repo
git status

# Verify base branch exists
git rev-parse --verify main

# Verify no conflicting worktree
git worktree list | grep -q "civ-$plan_name" && echo "Worktree exists!"

# Verify no conflicting branch
git branch --list "feature/$plan_name" | grep -q . && echo "Branch exists!"

# Verify disk space
df -h .

# Verify npm is available
npm --version
```

## Worktree Cleanup

Worktree cleanup is manual (user responsibility). After merging:

```bash
# Remove worktree
git worktree remove ../civ-feature-name

# Or force remove if dirty
git worktree remove --force ../civ-feature-name

# Delete branch if no longer needed
git branch -d feature/feature-name
```

## Naming Conventions

### Worktree Directory
```
../civ-<plan-name>/
```
Example: `../civ-2026-01-18-typescript-port/`

### Branch Name
```
feature/<plan-name>
```
Example: `feature/2026-01-18-typescript-port`

## Multi-Phase Feature Workflow

For features spanning multiple phases:

1. Create initial feature branch from main
2. Implement Phase 1, commit
3. For Phase 2+, optionally create branch from dev/feature branch
4. Each phase can have its own branch for isolated review

## Plugin Requirements

The following Claude plugins enhance the workflow when available:

| Plugin | Purpose | Integration Point | Required |
|--------|---------|-------------------|----------|
| `code-simplifier` | Automated complexity analysis | Section 5: Code Simplification | Optional |
| `code-review` | 4-agent parallel code review | Section 6: Parallel Code Review | Optional |
| `pr-review-toolkit` | Specialized PR analysis (4 agents) | Section 6: Quality Gates | Optional |

**Availability Check**: At each integration point, the workflow checks if the plugin is available. If unavailable, it falls back to manual processes:
- `code-simplifier` unavailable: Use manual simplification checklist
- `code-review` unavailable: Use custom review agents only
- `pr-review-toolkit` unavailable: Skip quality gate analysis, note in validation document

**Installation**: Plugins are managed through the Claude plugin system. Refer to plugin documentation for installation instructions.

## Required Permissions

The following permissions are needed in `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(gh:*)"
    ]
  }
}
```
