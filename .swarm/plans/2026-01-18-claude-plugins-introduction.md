# Plan: Claude Plugins Introduction

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

This plan introduces useful Claude Code plugins from `anthropics/claude-plugins-official` to enhance the OpenCiv development workflow. The focus is on 5 highly recommended plugins (typescript-lsp, code-review, feature-dev, commit-commands, pr-review-toolkit) with 3 optional medium-priority plugins (hookify, code-simplifier, security-guidance). These plugins will complement the existing `.claude/skills/` (bitECS patterns, implement-worktree, create-skill).

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-claude-plugins-analysis.md`:

- **25 official plugins** available, 5 rated HIGH usefulness for OpenCiv
- **typescript-lsp**: Core language intelligence for the TypeScript codebase
- **code-review**: Automated PR reviews with 4 specialized agents
- **feature-dev**: 7-phase structured workflow for building features
- **commit-commands**: Streamlined git workflows via slash commands
- **pr-review-toolkit**: 6 specialized agents for comprehensive PR analysis
- **Existing skills complement** plugins: Skills are project-specific (bitECS patterns), plugins are workflow-wide (code review, commits)

### Existing Skill Integration Points

| Existing Skill | Plugin Complement |
|----------------|-------------------|
| `bitecs/*` skills | feature-dev for structured implementation, code-review for pattern validation |
| `implement-worktree` | commit-commands for streamlined commits, pr-review-toolkit for PR creation |
| `create-skill` | hookify to enforce skill patterns |

---

## Phased Implementation

### Phase 1: TypeScript LSP Setup

**Goal**: Enable TypeScript language intelligence for improved code navigation and error detection.

- [ ] Install typescript-language-server globally: `npm install -g typescript-language-server typescript`
- [ ] Verify tsconfig.json compatibility with LSP
- [ ] Test LSP functionality with go-to-definition and find-references
- [ ] Document LSP status in project README or CLAUDE.md

**Dependencies**: Node.js, npm, existing tsconfig.json
**Verification**: LSP responds to TypeScript queries in the project

---

### Phase 2: Core Development Plugins

**Goal**: Install the 4 core development workflow plugins.

#### 2.1 code-review Plugin

- [ ] Install code-review plugin from anthropics/claude-plugins-official
- [ ] Verify plugin recognizes CLAUDE.md for guideline compliance checks
- [ ] Test code review on a sample PR or diff
- [ ] Document usage: triggers, expected output, confidence scoring (80+)

**Key Features**:
- Runs 4 parallel agents for comprehensive review
- Checks CLAUDE.md guideline compliance
- Links findings to exact SHA and line ranges

#### 2.2 feature-dev Plugin

- [ ] Install feature-dev plugin
- [ ] Test the 7-phase workflow: Discovery, Exploration, Questions, Design, Implementation, Review, Summary
- [ ] Verify integration with existing bitECS skills for architecture guidance
- [ ] Document how to invoke and customize phases

**Key Features**:
- Uses parallel agents for codebase exploration
- Presents multiple implementation approaches
- Includes quality review phase

#### 2.3 commit-commands Plugin

- [ ] Install commit-commands plugin
- [ ] Test `/commit` command for auto-generated commit messages
- [ ] Test `/commit-push-pr` workflow (requires gh CLI)
- [ ] Test `/clean_gone` for stale branch cleanup
- [ ] Document integration with existing implement-worktree skill

**Key Features**:
- Analyzes staged and unstaged changes
- Reviews recent commits for style matching
- GitHub CLI integration for PR creation

#### 2.4 pr-review-toolkit Plugin

- [ ] Install pr-review-toolkit plugin
- [ ] Test individual agents:
  - comment-analyzer (documentation accuracy)
  - pr-test-analyzer (Vitest + Playwright coverage)
  - silent-failure-hunter (error handling)
  - type-design-analyzer (TypeScript type rating 1-10)
  - code-reviewer (general quality)
  - code-simplifier (complexity reduction)
- [ ] Document which agents are most useful for OpenCiv (likely: pr-test-analyzer, type-design-analyzer)

**Key Features**:
- 6 specialized review agents
- TypeScript type system rating
- Test coverage analysis for Vitest + Playwright

---

### Phase 3: Medium Priority Plugins (Optional)

**Goal**: Install optional plugins based on team workflow needs.

#### 3.1 hookify Plugin

- [ ] Evaluate need for custom hooks to prevent unwanted behaviors
- [ ] If useful, install hookify plugin
- [ ] Create sample hook for ECS pattern enforcement (e.g., prevent direct component mutation)
- [ ] Document hook file format and hot-loading behavior

**Use Cases for OpenCiv**:
- Prevent modifications to core game systems without review
- Enforce ECS patterns (no direct state mutation)
- Block operations on protected files

#### 3.2 code-simplifier Plugin

- [ ] Install code-simplifier plugin
- [ ] Run on existing codebase to identify complexity hotspots
- [ ] Document recommended usage cadence (e.g., weekly code health check)

**Use Cases for OpenCiv**:
- Game loop optimization
- Maintaining clean ECS architecture
- Reducing complexity in rendering systems

#### 3.3 security-guidance Plugin

- [ ] Install security-guidance plugin
- [ ] Run baseline security scan on current codebase
- [ ] Document security considerations for future multiplayer/networking features

**Use Cases for OpenCiv**:
- XSS prevention if user input is added
- General security hygiene
- Future multiplayer security planning

---

### Phase 4: Documentation and Integration

**Goal**: Document plugin usage and integrate with existing workflows.

- [ ] Update CLAUDE.md with plugin availability and usage notes
- [ ] Create `.claude/plugins-guide.md` documenting all installed plugins
- [ ] Document plugin vs skill interaction (skills=project-specific, plugins=workflow-wide)
- [ ] Update implement-worktree skill to reference commit-commands and pr-review-toolkit
- [ ] Add plugin usage examples to project documentation

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/.claude/plugins-guide.md` | Create | Plugin usage documentation |
| `/Users/alex/workspace/civ/CLAUDE.md` | Modify | Add plugin availability section |
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Modify | Reference commit-commands integration |

---

## Success Criteria

### Phase 1: TypeScript LSP
- [ ] `typescript-language-server --version` returns valid version
- [ ] LSP provides hover information for TypeScript symbols
- [ ] Go-to-definition works for project files

### Phase 2: Core Development Plugins
- [ ] code-review plugin produces findings for test PR
- [ ] feature-dev plugin guides through 7-phase workflow
- [ ] `/commit` command generates appropriate commit messages
- [ ] pr-review-toolkit agents produce actionable feedback

### Phase 3: Medium Priority Plugins
- [ ] hookify can create and enforce custom hooks (if installed)
- [ ] code-simplifier identifies complexity reduction opportunities
- [ ] security-guidance provides security recommendations

### Phase 4: Documentation
- [ ] plugins-guide.md covers all installed plugins
- [ ] CLAUDE.md reflects plugin availability
- [ ] Team can invoke plugins without additional reference

---

## Dependencies & Integration

### Depends On
- **Node.js / npm**: For typescript-language-server installation
- **gh CLI**: For commit-commands PR creation (optional but recommended)
- **Git**: For all version control operations
- **Existing tsconfig.json**: For LSP compatibility

### Consumed By
- **Developer workflows**: Daily development with enhanced tooling
- **PR review process**: Automated code review before human review
- **Feature development**: Structured approach via feature-dev plugin
- **implement-worktree skill**: Enhanced with commit-commands integration

### Integration Points

| Integration | Description |
|-------------|-------------|
| bitECS skills + feature-dev | Use feature-dev's Design phase with bitECS patterns |
| implement-worktree + commit-commands | Use `/commit` during worktree implementation |
| implement-worktree + pr-review-toolkit | Use agents during review documentation step |
| CLAUDE.md + code-review | Plugin reads CLAUDE.md for guideline compliance |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Plugin installation mechanism unclear | Medium | Medium | Research official installation docs; may need Claude Code update |
| Plugins conflict with existing skills | Low | Low | Skills and plugins operate at different levels; test incrementally |
| typescript-lsp performance on large files | Low | Low | LSP is optimized; monitor for any slowdowns |
| Too many plugins overwhelm workflow | Medium | Medium | Install Phase 2 first; add Phase 3 only if needed |
| Plugin updates break compatibility | Low | Low | Pin plugin versions; test after updates |

---

## Open Questions (From Research)

These questions should be resolved during implementation:

1. **Plugin Installation Mechanism**: How exactly are official plugins installed in Claude Code?
   - Is there a `/plugins` command or settings-based approach?
   - Resolved during: Phase 2 installation

2. **LSP Configuration**: Does typescript-lsp require project-specific configuration beyond tsconfig.json?
   - Expected: Works with existing tsconfig.json
   - Resolved during: Phase 1 testing

3. **Plugin vs Skill Priority**: When both a plugin and skill could handle a task, which takes precedence?
   - Expected: Skills are project-specific overrides; plugins are defaults
   - Resolved during: Phase 4 documentation

---

## Installation Reference

### Priority 1: Install Immediately (Phase 1-2)

```bash
# TypeScript LSP (system-wide)
npm install -g typescript-language-server typescript

# Verify installation
typescript-language-server --version
tsc --version
```

### Plugin Installation (Phase 2-3)

Installation method depends on Claude Code's plugin system. Options to investigate:

1. **Settings-based**: Add to `.claude/settings.json` or similar
2. **Command-based**: Use `/plugin install <name>` if available
3. **Directory-based**: Clone into `.claude/plugins/` if supported

Resolve during Phase 2 implementation.

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: TypeScript LSP | Install, verify, document | 30 minutes |
| Phase 2: Core Plugins | Install and test 4 plugins | 2-3 hours |
| Phase 3: Optional Plugins | Evaluate and install 0-3 plugins | 1-2 hours |
| Phase 4: Documentation | Update docs, integrate workflows | 1-2 hours |
| **Total** | | **4-7 hours** |

---

## Appendix: Plugin Feature Summary

### High Priority Plugins

| Plugin | Primary Use | Key Commands/Features |
|--------|-------------|----------------------|
| typescript-lsp | Code intelligence | Go-to-definition, find references, hover info |
| code-review | PR review automation | 4 parallel agents, CLAUDE.md compliance |
| feature-dev | Structured development | 7 phases: Discovery through Summary |
| commit-commands | Git workflow | `/commit`, `/commit-push-pr`, `/clean_gone` |
| pr-review-toolkit | Deep PR analysis | 6 specialized agents |

### Medium Priority Plugins

| Plugin | Primary Use | Key Commands/Features |
|--------|-------------|----------------------|
| hookify | Custom guardrails | YAML-based hooks, hot-loading |
| code-simplifier | Complexity reduction | Identifies redundant code |
| security-guidance | Security best practices | Vulnerability detection |

---

## Appendix: Existing Skills Reference

The project already has custom skills in `.claude/skills/`:

| Skill | Purpose | Plugin Complement |
|-------|---------|-------------------|
| `bitecs/component` | Create bitECS components | feature-dev for design |
| `bitecs/system` | Create ECS systems | code-review for validation |
| `bitecs/query` | Create query patterns | pr-review-toolkit for analysis |
| `bitecs/module` | Create game modules | feature-dev for structure |
| `bitecs/factory` | Create entity factories | code-simplifier for optimization |
| `bitecs/store` | Create state storage | code-review for patterns |
| `bitecs/event` | Create event bus | security-guidance for validation |
| `bitecs/state` | Create state machines | type-design-analyzer for types |
| `implement-worktree` | Isolated feature implementation | commit-commands, pr-review-toolkit |
| `create-skill` | Create new skills | hookify for enforcement |
