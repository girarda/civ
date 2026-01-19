# Plan: Implement-Worktree Plugin Integration Enhancements

**Date**: 2026-01-18
**Status**: Implementation Complete

## Overview

This plan enhances the `/implement-worktree` skill to leverage the official Claude plugins: code-review, pr-review-toolkit, and code-simplifier. The integration will create a more robust implementation workflow by utilizing specialized review agents during code review phases, automated simplification during the code simplification step, and comprehensive PR analysis before completion.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-claude-plugins-analysis.md` and `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-claude-plugins-introduction.md`:

- **code-review plugin**: Runs 4 parallel agents for comprehensive review, checks CLAUDE.md compliance, links findings to exact SHA and line ranges
- **pr-review-toolkit plugin**: 6 specialized agents including:
  - `comment-analyzer` - Documentation accuracy
  - `pr-test-analyzer` - Test coverage analysis (Vitest + Playwright)
  - `silent-failure-hunter` - Error handling detection
  - `type-design-analyzer` - TypeScript type rating (1-10 scale)
  - `code-reviewer` - General quality checks
  - `code-simplifier` - Complexity reduction suggestions
- **code-simplifier plugin**: Standalone plugin for identifying redundant code and suggesting simplifications

### Current implement-worktree Workflow

The skill at `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` has these relevant sections:

| Section | Current Approach | Enhancement Opportunity |
|---------|-----------------|------------------------|
| 5. Code Simplification (lines 612-729) | Manual checklist-based review | Integrate code-simplifier plugin |
| 6. Parallel Code Review (lines 731-919) | Custom 3-agent review (Logic, Style, Performance) | Replace/augment with code-review and pr-review-toolkit agents |
| 9. PR/Manual Completion (lines 1282-1427) | Basic PR creation via gh CLI | Pre-PR analysis using pr-review-toolkit |

---

## Phased Implementation

### Phase 1: Code Simplification Plugin Integration

**Goal**: Replace the manual code simplification checklist with the code-simplifier plugin for automated complexity analysis.

- [x] Add plugin invocation section before the manual simplification checklist
- [x] Document how to invoke `code-simplifier` on changed files
- [x] Define integration between plugin suggestions and the apply-or-skip decision flow
- [x] Update the simplification summary format to include plugin findings
- [x] Preserve the existing manual checklist as a fallback if plugin is unavailable

**Modification Target**: Section 5 "Code Simplification" (lines 612-729)

**Implementation Details**:

```markdown
#### Code Simplifier Plugin Integration

Before applying manual simplification checks, invoke the code-simplifier plugin:

1. Get list of changed files:
   git diff --name-only <base-branch>...HEAD | grep -E '\.(ts|tsx)$'

2. Invoke code-simplifier plugin:
   For each changed file, request simplification analysis:
   - Redundant code detection
   - Complexity hotspots
   - Consolidation opportunities

3. Review plugin findings:
   - Critical findings: Apply automatically
   - Suggested improvements: Add to simplification queue
   - Low-impact suggestions: Document for optional review

4. Proceed with manual checklist for items not covered by plugin
```

---

### Phase 2: Code Review Plugin Integration

**Goal**: Integrate the code-review plugin into the parallel code review phase, complementing or replacing the custom agent definitions.

- [x] Add code-review plugin invocation at the start of the review phase
- [x] Define how plugin findings merge with custom agent findings
- [x] Leverage plugin's CLAUDE.md compliance checking
- [x] Update the findings aggregation format to include plugin source
- [x] Document confidence score threshold (80+) for auto-applying fixes

**Modification Target**: Section 6 "Parallel Code Review" (lines 731-919)

**Implementation Details**:

```markdown
#### Code Review Plugin Integration

The code-review plugin runs 4 parallel agents for comprehensive review:

1. **Plugin Invocation**:
   Invoke code-review plugin on the changed files:
   - Plugin reads CLAUDE.md for guideline compliance
   - Runs 4 specialized agents in parallel
   - Returns findings with confidence scores

2. **Findings Integration**:
   | Source | Focus Area | Priority |
   |--------|-----------|----------|
   | code-review plugin | CLAUDE.md compliance, obvious bugs, git history | High |
   | Custom Logic Agent | Algorithm correctness, edge cases | Medium |
   | Custom Style Agent | Naming, organization, DRY | Medium |
   | Custom Performance Agent | Complexity, PixiJS, memory | Medium |

3. **Confidence-Based Application**:
   - Confidence >= 80: Auto-apply fix
   - Confidence 50-79: Add to human review list
   - Confidence < 50: Document but do not suggest

4. **Aggregated Report**:
   Include source attribution in findings table:
   | File | Line | Source | Issue | Confidence | Suggested Fix |
```

---

### Phase 3: PR Review Toolkit Integration

**Goal**: Integrate pr-review-toolkit specialized agents for comprehensive pre-PR analysis.

- [x] Add pr-review-toolkit invocation after parallel code review
- [x] Integrate `pr-test-analyzer` for Vitest/Playwright coverage analysis
- [x] Integrate `type-design-analyzer` for TypeScript type rating
- [x] Integrate `silent-failure-hunter` for error handling audit
- [x] Integrate `comment-analyzer` for documentation accuracy
- [x] Add type rating (1-10) to validation document output
- [x] Define quality gates based on agent scores

**Modification Target**: New subsection in Section 6, and Section 7 "Re-validation" (lines 921-1065)

**Implementation Details**:

```markdown
#### PR Review Toolkit Integration

After the main code review, invoke pr-review-toolkit specialized agents:

1. **pr-test-analyzer**:
   - Analyzes test coverage for Vitest unit tests
   - Analyzes Playwright E2E test coverage
   - Reports coverage gaps for changed files
   - Quality gate: All changed code should have corresponding tests

2. **type-design-analyzer**:
   - Rates TypeScript type design on 1-10 scale
   - Identifies any `any` types or type assertions
   - Suggests type improvements
   - Quality gate: Score should be >= 7

3. **silent-failure-hunter**:
   - Detects missing error handling
   - Identifies swallowed errors
   - Checks for proper async/await error propagation
   - Quality gate: No critical findings

4. **comment-analyzer**:
   - Checks JSDoc accuracy for changed functions
   - Verifies documentation matches implementation
   - Quality gate: All exported functions documented

5. **Quality Gate Summary**:
   | Agent | Score/Status | Gate | Pass/Fail |
   |-------|-------------|------|-----------|
   | pr-test-analyzer | Coverage % | >= 80% | |
   | type-design-analyzer | 1-10 | >= 7 | |
   | silent-failure-hunter | Finding count | 0 critical | |
   | comment-analyzer | Accuracy % | >= 90% | |
```

---

### Phase 4: Update Documentation and Completion Flow

**Goal**: Update the human review documentation and PR creation flow to include plugin analysis results.

- [x] Add plugin findings section to human review document template
- [x] Include type rating score in validation document
- [x] Add quality gate summary to PR description when using `gh pr create`
- [x] Document plugin availability requirements
- [x] Add fallback instructions if plugins are not available

**Modification Target**: Section 7 (lines 921-1065), Section 8 (lines 1067-1280), Section 9 (lines 1282-1427)

**Implementation Details**:

```markdown
#### Enhanced Validation Document

Add to the validation document template:

## Plugin Analysis Results

### Code Simplifier
- Files analyzed: N
- Simplifications applied: M
- Remaining suggestions: K (see human review)

### Code Review Plugin
- Findings: X total
- Auto-applied: Y
- For review: Z

### PR Review Toolkit

| Agent | Result | Quality Gate |
|-------|--------|--------------|
| pr-test-analyzer | X% coverage | PASS/FAIL |
| type-design-analyzer | N/10 | PASS/FAIL |
| silent-failure-hunter | N findings | PASS/FAIL |
| comment-analyzer | X% accuracy | PASS/FAIL |

### Overall Plugin Assessment
**Status**: PASS / NEEDS ATTENTION
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Modify | Add plugin integration sections to phases 5, 6, 7, 8, 9 |

---

## Detailed Modification Map

### Section 5: Code Simplification (lines 612-729)

**Add before line 616 (after section header)**:

```markdown
#### Plugin-Assisted Simplification

If the code-simplifier plugin is available, invoke it first:

1. Identify changed source files:
   changed_files = git diff --name-only <base-branch>...HEAD | grep -E '\.(ts|tsx)$'

2. Invoke code-simplifier plugin:
   For each file in changed_files:
     - Request complexity analysis
     - Request redundancy detection
     - Request consolidation suggestions

3. Process plugin findings:
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

4. Continue with manual checklist below for remaining items
```

### Section 6: Parallel Code Review (lines 731-919)

**Add before line 743 (after "Review Agent Definitions" header)**:

```markdown
#### code-review Plugin (Primary Review)

The code-review plugin should be invoked first as the primary review mechanism:

1. **Invocation**:
   Invoke code-review plugin with:
   - List of changed files
   - Reference to CLAUDE.md for compliance checking
   - Base branch for context

2. **Plugin Agents**:
   The plugin runs 4 parallel internal agents:
   - Guideline compliance checker
   - Bug scanner
   - Git history analyzer
   - Code quality reviewer

3. **Processing Results**:
   Plugin findings are prioritized by confidence score:
   - 80+: Critical, apply automatically
   - 50-79: Major, flag for review
   - <50: Minor, document only

4. **Integration with Custom Agents**:
   After plugin review, run custom agents to cover areas not addressed:
```

**Add before line 919 (end of section)**:

```markdown
#### pr-review-toolkit Specialized Analysis

After aggregating code review findings, invoke pr-review-toolkit agents:

1. **pr-test-analyzer**:
   Analyze test coverage for changed files.
   Input: List of changed files, test directories
   Output: Coverage percentage, uncovered lines, missing test scenarios

2. **type-design-analyzer**:
   Rate TypeScript type quality.
   Input: Changed TypeScript files
   Output: Score 1-10, specific type issues, improvement suggestions

3. **silent-failure-hunter**:
   Detect error handling gaps.
   Input: Changed files
   Output: Missing try/catch, swallowed errors, unhandled promise rejections

4. **comment-analyzer**:
   Verify documentation accuracy.
   Input: Changed files with JSDoc
   Output: Accuracy percentage, outdated comments, missing documentation

5. **Quality Gate Enforcement**:
   Before proceeding to re-validation:
   - pr-test-analyzer: Warn if coverage < 80%
   - type-design-analyzer: Warn if score < 7
   - silent-failure-hunter: Block if critical findings
   - comment-analyzer: Warn if accuracy < 90%
```

### Section 7: Re-validation (lines 921-1065)

**Add to validation document template (after line 1022)**:

```markdown
## Plugin Analysis Summary

### Code Simplifier Results
- Files Analyzed: N
- Simplifications Applied: M
- Deferred to Manual Review: K

### Code Review Plugin Results
- Total Findings: X
- Auto-Applied: Y
- Flagged for Review: Z
- Confidence Distribution:
  - High (80+): A findings
  - Medium (50-79): B findings
  - Low (<50): C findings

### PR Review Toolkit Results

| Agent | Score/Result | Quality Gate | Status |
|-------|-------------|--------------|--------|
| pr-test-analyzer | X% coverage | >= 80% | PASS/FAIL |
| type-design-analyzer | N/10 | >= 7 | PASS/FAIL |
| silent-failure-hunter | N critical | 0 | PASS/FAIL |
| comment-analyzer | X% accurate | >= 90% | PASS/FAIL |

### Plugin Assessment
**Overall Status**: PASS / NEEDS ATTENTION

If NEEDS ATTENTION:
- List quality gate failures
- Required remediation steps
```

### Section 8: Human Review Documentation (lines 1067-1280)

**Add after line 1175 (after "Items for Human Review")**:

```markdown
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
```

---

## Success Criteria

### Phase 1: Code Simplification Integration
- [x] code-simplifier plugin invocation documented in Section 5
- [x] Plugin findings integrated into simplification workflow
- [x] Fallback to manual checklist when plugin unavailable
- [x] Simplification summary includes plugin analysis results

### Phase 2: Code Review Integration
- [x] code-review plugin documented as primary review mechanism
- [x] Confidence-based auto-apply logic documented
- [x] Custom agents documented as complementary (not replacement)
- [x] Findings aggregation includes source attribution

### Phase 3: PR Review Toolkit Integration
- [x] All 4 relevant agents (pr-test-analyzer, type-design-analyzer, silent-failure-hunter, comment-analyzer) documented
- [x] Quality gates defined with thresholds
- [x] Integration point between review and re-validation documented
- [x] Type rating score included in validation output

### Phase 4: Documentation Updates
- [x] Human review document template includes plugin findings section
- [x] Validation document includes plugin analysis summary
- [x] Quality gate summary format defined
- [x] Plugin availability requirements documented

---

## Dependencies & Integration

### Depends On
- **Claude Plugins Introduction Plan**: Plugins must be installed per `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-claude-plugins-introduction.md`
- **Plugin Availability**: code-review, pr-review-toolkit, code-simplifier must be available
- **Existing Skill Structure**: Current SKILL.md structure at `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`

### Consumed By
- **Developer Workflows**: Enhanced code quality through automated analysis
- **PR Reviews**: More comprehensive pre-PR analysis
- **Human Reviewers**: Better documented findings for review

### Integration Points

| Integration | Description |
|-------------|-------------|
| code-simplifier + Section 5 | Plugin runs before manual checklist |
| code-review + Section 6 | Plugin is primary review, custom agents complement |
| pr-review-toolkit + Section 6/7 | Agents run after code review, before re-validation |
| Plugin results + Section 7/8 | Results included in validation and review docs |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plugins not installed | Medium | Medium | Document fallback to manual process; add plugin availability check |
| Plugin output format changes | Low | Low | Document expected output format; use flexible parsing |
| Quality gates too strict | Medium | Medium | Make thresholds configurable; start with warnings not blocks |
| Increased workflow complexity | Medium | Low | Clearly document when plugins are invoked; provide skip option |
| Plugin performance overhead | Low | Low | Plugins run in parallel where possible; async invocation |

---

## Plugin Reference

### code-simplifier
- **Purpose**: Identify redundant code and suggest simplifications
- **Input**: Source files to analyze
- **Output**: Complexity hotspots, redundancy locations, consolidation opportunities
- **Integration Point**: Section 5 (Code Simplification)

### code-review
- **Purpose**: Automated PR review with 4 parallel agents
- **Input**: Changed files, CLAUDE.md reference, base branch
- **Output**: Findings with confidence scores (0-100), linked to SHA and lines
- **Integration Point**: Section 6 (Parallel Code Review)

### pr-review-toolkit
- **Purpose**: Specialized PR analysis agents
- **Agents**:
  - `pr-test-analyzer`: Test coverage analysis (Vitest + Playwright)
  - `type-design-analyzer`: TypeScript type rating (1-10 scale)
  - `silent-failure-hunter`: Error handling audit
  - `comment-analyzer`: Documentation accuracy
- **Integration Point**: Section 6 (after code review), Section 7 (validation)

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Code Simplifier | 5 tasks | 30 minutes |
| Phase 2: Code Review | 5 tasks | 45 minutes |
| Phase 3: PR Review Toolkit | 7 tasks | 1 hour |
| Phase 4: Documentation | 5 tasks | 45 minutes |
| **Total** | 22 tasks | **3 hours** |

---

## Appendix: Modified Section Locations

| Section | Lines | Modification Type |
|---------|-------|------------------|
| 5. Code Simplification | 612-729 | Add plugin invocation before manual checklist |
| 6. Parallel Code Review | 731-919 | Add code-review plugin as primary; add pr-review-toolkit at end |
| 7. Re-validation | 921-1065 | Add plugin analysis to validation document template |
| 8. Human Review Documentation | 1067-1280 | Add plugin findings section to review document template |
| 9. PR or Manual Completion | 1282-1427 | Include quality gate summary in PR body |
