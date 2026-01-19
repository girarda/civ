# Research: Claude Plugins Analysis for OpenCiv

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research identifies which official Claude plugins from `anthropics/claude-plugins-official` would be useful for the OpenCiv game project - a TypeScript/PixiJS 4X strategy game using bitECS, honeycomb-grid, and simplex-noise.

## All Available Plugins (25 total)

| Plugin | Category | Usefulness for OpenCiv |
|--------|----------|------------------------|
| typescript-lsp | Language Server | **HIGH** |
| code-review | Development | **HIGH** |
| feature-dev | Development | **HIGH** |
| commit-commands | Git Workflow | **HIGH** |
| pr-review-toolkit | Code Review | **HIGH** |
| hookify | Configuration | **MEDIUM** |
| code-simplifier | Refactoring | **MEDIUM** |
| security-guidance | Security | **MEDIUM** |
| frontend-design | UI/UX | LOW |
| agent-sdk-dev | SDK Development | LOW |
| explanatory-output-style | Output Style | LOW |
| learning-output-style | Output Style | LOW |
| plugin-dev | Plugin Creation | LOW |
| example-plugin | Template | LOW |
| ralph-loop | Unknown | LOW |
| clangd-lsp | C/C++ | NOT USEFUL |
| csharp-lsp | C# | NOT USEFUL |
| gopls-lsp | Go | NOT USEFUL |
| jdtls-lsp | Java | NOT USEFUL |
| kotlin-lsp | Kotlin | NOT USEFUL |
| lua-lsp | Lua | NOT USEFUL |
| php-lsp | PHP | NOT USEFUL |
| pyright-lsp | Python | NOT USEFUL |
| rust-analyzer-lsp | Rust | NOT USEFUL |
| swift-lsp | Swift | NOT USEFUL |

## Highly Recommended Plugins

### 1. typescript-lsp
**Purpose**: TypeScript and JavaScript language intelligence

**Why it's useful for OpenCiv**:
- The entire codebase is TypeScript (`src/**/*.ts`)
- Provides go-to-definition, find references, error checking
- Handles `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs` files
- Will improve Claude's ability to navigate and understand the type system

**Installation**:
```bash
npm install -g typescript-language-server typescript
```

### 2. code-review
**Purpose**: Automated PR reviews with multiple specialized agents

**Why it's useful for OpenCiv**:
- Runs 4 parallel agents for comprehensive code review
- Checks CLAUDE.md guideline compliance (OpenCiv has a detailed CLAUDE.md)
- Scans for obvious bugs
- Analyzes git history for context
- Confidence scoring (80+) reduces false positives
- Direct GitHub integration

**Key Features**:
- Links findings to exact SHA and line ranges
- Filters out pre-existing issues and linter-catchable problems

### 3. feature-dev
**Purpose**: Structured 7-phase workflow for building features

**Why it's useful for OpenCiv**:
- OpenCiv is actively under development with many planned features
- Guides through: Discovery → Exploration → Questions → Design → Implementation → Review → Summary
- Uses parallel agents for codebase exploration
- Presents multiple implementation approaches with trade-offs
- Includes quality review phase

**Phases**:
1. Discovery - Understand requirements
2. Codebase Exploration - Analyze existing patterns (ECS, hex grid, rendering)
3. Clarifying Questions - Resolve specification gaps
4. Architecture Design - Multiple approaches for game systems
5. Implementation - Build following chosen architecture
6. Quality Review - Parallel code reviews
7. Summary - Document what was built

### 4. commit-commands
**Purpose**: Streamlined git workflows via slash commands

**Why it's useful for OpenCiv**:
- `/commit` - Auto-generates commit messages matching repo style
- `/commit-push-pr` - Complete workflow: branch → commit → push → PR
- `/clean_gone` - Removes stale local branches

**Key Features**:
- Analyzes both staged and unstaged changes
- Reviews recent commits for style matching
- Prevents accidental commits of secrets
- GitHub CLI integration for PR creation

### 5. pr-review-toolkit
**Purpose**: Six specialized agents for comprehensive PR analysis

**Why it's useful for OpenCiv**:
- **comment-analyzer** - Documentation accuracy (useful for game system docs)
- **pr-test-analyzer** - Test coverage quality (Vitest + Playwright)
- **silent-failure-hunter** - Error handling practices
- **type-design-analyzer** - Rates TypeScript type systems 1-10
- **code-reviewer** - General quality and guideline compliance
- **code-simplifier** - Identifies unnecessary complexity

**Especially valuable for**:
- Evaluating bitECS component/system design
- Checking test coverage for game mechanics
- Analyzing TypeScript type safety

## Medium Priority Plugins

### 6. hookify
**Purpose**: Create custom hooks to prevent unwanted behaviors

**Why it's useful for OpenCiv**:
- Can analyze conversation patterns to create rules
- Lightweight markdown files with YAML frontmatter
- Pattern matching via regex
- Hot-loading without restart

**Use cases**:
- Prevent accidental modifications to core game systems
- Enforce ECS patterns
- Block operations on protected files

### 7. code-simplifier
**Purpose**: Identifies complexity and suggests improvements

**Why it's useful for OpenCiv**:
- Detects redundant code
- Suggests simplifications while preserving functionality
- Useful for game loop optimization
- Helps maintain clean ECS architecture

### 8. security-guidance
**Purpose**: Security best practices and vulnerability detection

**Why it's useful for OpenCiv**:
- Helps prevent XSS if game ever has user input
- General security hygiene
- Useful when adding multiplayer/networking features

## Not Recommended for This Project

### Language Server Plugins (10 plugins)
These are NOT useful because OpenCiv is 100% TypeScript:
- `clangd-lsp` (C/C++)
- `csharp-lsp` (C#)
- `gopls-lsp` (Go)
- `jdtls-lsp` (Java)
- `kotlin-lsp` (Kotlin)
- `lua-lsp` (Lua)
- `php-lsp` (PHP)
- `pyright-lsp` (Python)
- `rust-analyzer-lsp` (Rust)
- `swift-lsp` (Swift)

### Other Low-Relevance Plugins
- `frontend-design` - OpenCiv uses PixiJS canvas rendering, not standard HTML/CSS UI
- `agent-sdk-dev` - Only useful if building Claude Agent SDK applications
- `explanatory-output-style` / `learning-output-style` - Output formatting preferences, not development tools
- `plugin-dev` / `example-plugin` - Only useful if creating Claude plugins
- `ralph-loop` - Specialized use case, unclear documentation

## Codebase Context

### Current Technology Stack
| Technology | Version | Plugin Relevance |
|------------|---------|------------------|
| TypeScript | 5.x | typescript-lsp |
| PixiJS | 8.x | code-review, feature-dev |
| bitECS | latest | code-review, feature-dev |
| Vitest | latest | pr-review-toolkit |
| Playwright | latest | pr-review-toolkit |
| Vite | 5.x | commit-commands |

### Source Structure
```
src/
  main.ts              # Application entry
  hex/                 # Hex coordinate system (TilePosition, HexGridLayout)
  tile/                # Tile data models (14 terrains, 6 features, 26 resources)
  map/                 # Map generation (MapConfig, MapGenerator)
  render/              # Rendering (TileRenderer, CameraController, TileHighlight)
  ecs/                 # ECS setup (world, components, systems)
  ui/                  # UI systems (HoverState, HoverSystem)
```

### Existing Claude Configuration
The project already has custom skills in `.claude/skills/`:
- bitECS patterns (component, system, query)
- implement-worktree skill
- create-skill template

The recommended plugins will **complement** these existing skills by providing:
- Language intelligence (typescript-lsp)
- Automated review workflows (code-review, pr-review-toolkit)
- Structured development processes (feature-dev)
- Git workflow automation (commit-commands)

## Installation Guide

### Priority 1: Install immediately
```bash
# TypeScript LSP
npm install -g typescript-language-server typescript

# Then install plugins via Claude Code
# (Use the plugin installation mechanism for code-review, feature-dev, commit-commands, pr-review-toolkit)
```

### Priority 2: Consider based on workflow
- hookify - If you want to enforce development patterns
- code-simplifier - For periodic code quality reviews

## Open Questions

1. **Plugin Installation**: How are official plugins installed in Claude Code?
   - Is there a `/plugins` command?
   - Are they enabled via settings?

2. **Plugin vs Skill Interaction**: Will plugins interfere with existing `.claude/skills/`?
   - Skills are project-specific, plugins are global
   - Should complement each other

3. **LSP Configuration**: Does typescript-lsp require project-specific config?
   - Should work with existing `tsconfig.json`

## Conclusion

**Install these 5 plugins** for maximum benefit to the OpenCiv project:
1. **typescript-lsp** - Core language intelligence
2. **code-review** - Automated PR reviews
3. **feature-dev** - Structured feature development
4. **commit-commands** - Git workflow automation
5. **pr-review-toolkit** - Comprehensive code analysis

These plugins align perfectly with the TypeScript/game development workflow and will enhance Claude's ability to help with ECS patterns, game mechanics, and code quality in the OpenCiv project.
