# Research: Claude Code Skills Creation

**Date**: 2026-01-18
**Status**: Complete

## Summary

Claude Code has two distinct extension mechanisms: **Skills** and **Commands**. Skills are stored in `.claude/skills/` with YAML frontmatter including `name`, `description`, and `user-invocable` fields, and can be automatically activated based on user intent. Commands are stored in `.claude/commands/` with simpler frontmatter and are explicitly invoked via `/project:` or `/user:` namespaces. The previous research document (2026-01-17-skills-creation.md) incorrectly conflated these two concepts.

## Key Discoveries

- **Skills are NOT commands**: They have different directory locations, frontmatter schemas, and invocation patterns
- **Skills directory**: `.claude/skills/<skill-name>/SKILL.md` (with directory) OR `.claude/skills/<skill-name>.md` (flat)
- **Commands directory**: `.claude/commands/<command-name>.md`
- **Skills can auto-activate**: Based on description matching user requests
- **Commands require explicit invocation**: Via `/project:command-name` slash syntax
- **Skills have richer frontmatter**: Including `user-invocable` boolean for dual-mode activation

## Architecture Overview

### Skills vs Commands Comparison

| Aspect | Skills | Commands |
|--------|--------|----------|
| **Directory** | `.claude/skills/` | `.claude/commands/` |
| **Scopes** | Project (`.claude/`) and Personal (`~/.claude/`) | Project (`.claude/`) and Personal (`~/.claude/`) |
| **File structure** | Can be `<name>/SKILL.md` or `<name>.md` | Always `<name>.md` |
| **Activation** | Auto-activated by intent OR manual | Manual only via `/project:` or `/user:` |
| **Frontmatter** | `name`, `description`, `user-invocable`, etc. | `description`, `argument-hint`, `allowed-tools` |
| **Namespace** | Selected from skill picker or auto-matched | `/project:name` or `/user:name` |

### Skills Directory Structure

```
.claude/
  skills/
    simple-skill.md                    # Flat file skill
    complex-skill/
      SKILL.md                         # Main skill file
      supporting-data.json             # Optional supporting files
      templates/
        example.md                     # Reference templates
```

### Commands Directory Structure

```
.claude/
  commands/
    command-name.md                    # -> /project:command-name
    nested/
      sub-command.md                   # -> /project:nested/sub-command
```

## Skills Format (Official)

### YAML Frontmatter Schema

```yaml
---
name: skill-name-kebab-case              # Required: identifier
description: Third-person description... # Required: what it does + when to use
user-invocable: true                     # Optional: allow manual invocation
allowed-tools: Tool1,Tool2               # Optional: restrict available tools
context: fork                            # Optional: execution context
---
```

### Description Best Practices

The `description` field is critical for auto-activation. It should:

1. Be written in **third person** (describes what the skill does, not instructions)
2. Include **trigger keywords** users naturally say
3. Describe both **what** it does and **when** to use it

**Good example:**
```yaml
description: Creates a new Bevy ECS component with proper derives and documentation. Use when the user asks to generate, create, or add a new component to the game.
```

**Poor example:**
```yaml
description: Component creator
```

### Complete Skill Example

```markdown
---
name: create-bevy-component
description: Creates a new Bevy ECS component with proper derives and documentation. Use when the user asks to generate, create, or add a new component, struct for ECS, or game entity data.
user-invocable: true
---

# Create Bevy Component

## Purpose
Generate a well-structured Bevy ECS component following project conventions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the component name and purpose.

## Instructions

1. Parse the component name (convert to PascalCase if needed)
2. Determine appropriate derives based on usage:
   - Always: `Component`
   - Usually: `Debug`, `Clone`
   - If comparable: `PartialEq`, `Eq`
   - If default needed: `Default`
   - If serializable: `Serialize`, `Deserialize`, `Reflect`
3. Generate doc comments explaining purpose
4. Include field documentation

## Output Format

```rust
/// [Component description]
///
/// # Example
/// ```
/// commands.spawn([ComponentName]::default());
/// ```
#[derive(Component, Debug, Clone, Default)]
pub struct ComponentName {
    /// Field description
    pub field: Type,
}
```

## If unclear
- Make reasonable assumptions and list them
- Ask at most 2 clarifying questions if truly blocked
```

## Commands Format

### YAML Frontmatter Schema

```yaml
---
description: Brief description of what command does
argument-hint: <required-arg> [optional-arg]
allowed-tools: Bash(specific:*),Read,Write    # Optional: tool restrictions
---
```

### Complete Command Example

From `/Users/alex/gt/.claude/commands/handoff.md`:

```markdown
---
description: Hand off to fresh session, work continues from hook
allowed-tools: Bash(gt mail send:*),Bash(gt handoff:*)
argument-hint: [message]
---

Hand off to a fresh session.

User's handoff message (if any): $ARGUMENTS

Execute these steps in order:

1. If user provided a message, send handoff mail...
2. Run the handoff command...
```

## Best Practices for Skills Authoring

### 1. Set the Right Degree of Freedom

| Task Type | Freedom Level | Approach |
|-----------|---------------|----------|
| Analysis/review | High | Open-ended exploration |
| Common workflows | Medium | Templates + structured steps |
| Critical operations | Low | Exact commands + sequences |

### 2. Be Concise

- Assume Claude knows general concepts
- Include only what's needed for correct, repeatable execution
- Don't explain basic programming concepts

### 3. Use Progressive Disclosure

- Keep `SKILL.md` short and focused
- For lengthy reference material, use additional files:
  ```
  skill-name/
    SKILL.md              # Core instructions (short)
    templates.md          # Reference templates
    examples.md           # Detailed examples
  ```

### 4. Avoid Time-Sensitive Assumptions

- Don't reference "current" versions or dates
- If version matters, instruct how to verify
- Let Claude look up current information

### 5. Include Error Handling

Add an "If unclear" section:
```markdown
## If unclear
- Make reasonable assumptions and list them
- If truly blocked, ask at most 2 targeted questions
- For "best practices" requests, include a brief checklist
```

### 6. Scope Selection

| Scope | Location | Use When |
|-------|----------|----------|
| Project | `.claude/skills/` | Project-specific patterns |
| Personal | `~/.claude/skills/` | Cross-project workflows |

Default to project scope unless explicitly needed globally.

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/gt/civ/crew/alex/.claude/skills/create-skill.md` | Reference skill implementation |
| `/Users/alex/gt/.claude/commands/gastown.md` | Reference command (240 lines, complex) |
| `/Users/alex/gt/.claude/commands/handoff.md` | Reference command with tool restrictions |
| `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-skills-creation.md` | Previous (inaccurate) research |

## Skill Invocation Patterns

### Automatic Activation

When a user request matches the skill's `description`, Claude automatically activates it:

```
User: "Create a new position component for tracking entity locations"
-> Matches skill with description containing "create...component"
-> Skill auto-activates
```

### Manual Invocation (if user-invocable: true)

1. Type `/` in Claude Code
2. Select the skill from the picker
3. Optionally provide arguments

### Commands (always explicit)

```
/project:command-name arguments here
/user:command-name arguments here
```

## Recommendations

### For New Skills

1. **Start with description**: Write the trigger keywords first
2. **Test activation**: Verify the skill activates on expected phrases
3. **Iterate on description**: Add keywords users actually say
4. **Keep instructions focused**: One skill = one task

### For Converting Commands to Skills

If you have a command that should auto-activate:

1. Move from `.claude/commands/` to `.claude/skills/`
2. Change frontmatter:
   ```yaml
   # Before (command)
   ---
   description: Brief description
   argument-hint: <args>
   ---

   # After (skill)
   ---
   name: command-name
   description: Third-person description with trigger keywords...
   user-invocable: true
   ---
   ```
3. Update instructions to follow skill patterns

### For Choosing Between Skills and Commands

| Use Skills When | Use Commands When |
|-----------------|-------------------|
| Want auto-activation | Want explicit control |
| Common workflows | Specialized operations |
| User intent varies | Exact syntax matters |
| Discovery is helpful | Precision is required |

## Corrections to Previous Research

The file `2026-01-17-skills-creation.md` contains several inaccuracies:

| Claim | Correction |
|-------|------------|
| "Skills are stored in `.claude/commands/`" | Skills are in `.claude/skills/`, commands are in `.claude/commands/` |
| "Skills use `/project:skill-name`" | That's commands; skills use auto-activation or picker |
| "Filename becomes command name" | True for commands, not skills (skills use `name` frontmatter) |
| "No special syntax required" | Skills require YAML frontmatter with `name` and `description` |

## Open Questions

1. **Frontmatter validation**: What happens if required frontmatter fields are missing?

2. **Conflict resolution**: If multiple skills match user intent, how is selection handled?

3. **Skill composition**: Can skills reference or invoke other skills?

4. **Context isolation**: Does `context: fork` provide full isolation?

5. **Tool restrictions**: How granular can `allowed-tools` patterns be?

6. **Version compatibility**: Are there breaking changes in skill format between Claude Code versions?
