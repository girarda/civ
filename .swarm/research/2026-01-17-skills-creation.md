# Research: Claude Code Skills/Commands System

**Date**: 2026-01-17
**Status**: Complete

## Summary

Claude Code supports custom slash commands (referred to as "skills") that allow users to create reusable prompts and workflows. These commands are stored as markdown files in specific directories and become available through the `/project:` or `/user:` namespace. This research documents how to create effective skills for Claude Code.

## Key Discoveries

- **Skills are markdown files**: Each skill is a `.md` file containing the prompt/instructions
- **Two scopes**: Project-level (`.claude/commands/`) and User-level (`~/.claude/commands/`)
- **Naming convention**: Filename becomes command name (e.g., `create-skill.md` -> `/project:create-skill`)
- **Template variables**: Skills can use `$ARGUMENTS` to accept user input
- **No special syntax required**: Plain markdown with instructions works as the skill content
- **Skills can reference files**: Use relative paths from project root for context

## Architecture Overview

### Directory Structure

```
Project-level skills (available in current project):
.claude/
  commands/
    skill-name.md        # -> /project:skill-name
    nested/
      sub-skill.md       # -> /project:nested/sub-skill

User-level skills (available globally):
~/.claude/
  commands/
    skill-name.md        # -> /user:skill-name
```

### Skill File Format

A skill file is a markdown file containing:

1. **Instructions**: What Claude should do when the command is invoked
2. **Context**: Any background information needed
3. **Variables**: `$ARGUMENTS` for user-provided input
4. **Examples**: Optional examples to guide behavior

### Example Skill Structure

```markdown
Analyze the provided code and suggest improvements.

Focus on:
- Code quality and readability
- Performance optimizations
- Security considerations
- Best practices

$ARGUMENTS

Provide actionable recommendations with code examples.
```

## Patterns Found

### 1. Simple Task Skill
Basic skills that perform a single focused task:
```markdown
Review the following code for potential bugs and issues:

$ARGUMENTS

List each issue found with:
1. Location (file and line if applicable)
2. Description of the problem
3. Suggested fix
```

### 2. Research/Exploration Skill
Skills that systematically explore a topic:
```markdown
Research the following topic in this codebase: $ARGUMENTS

1. Use Glob to find relevant files
2. Use Grep to search for related patterns
3. Read key files to understand implementation
4. Document findings in a structured format
```

### 3. Generation Skill
Skills that create new code or content:
```markdown
Create a new [component type] with the following requirements:

$ARGUMENTS

Follow these project conventions:
- Use TypeScript with strict mode
- Include JSDoc comments
- Add unit tests
- Follow existing code patterns
```

### 4. Multi-Step Workflow Skill
Complex skills that chain multiple operations:
```markdown
Perform a complete feature implementation:

Feature: $ARGUMENTS

Steps:
1. Research existing patterns in the codebase
2. Create a design document
3. Implement the feature
4. Write tests
5. Update documentation
```

### 5. Context-Aware Skill
Skills that leverage project-specific knowledge:
```markdown
This project uses:
- TypeScript with strict mode
- Jest for testing
- WebSocket for networking
- Canvas2D for rendering

Given this context, help with: $ARGUMENTS
```

## Best Practices for Creating Skills

### 1. Clear Purpose
- Each skill should have a single, well-defined purpose
- Name should clearly indicate what the skill does
- Include a brief description at the top

### 2. Structured Instructions
- Use numbered steps for complex workflows
- Include specific criteria for success
- Provide examples when helpful

### 3. Flexible Arguments
- Use `$ARGUMENTS` to accept variable input
- Document expected argument format
- Handle missing arguments gracefully

### 4. Project Context
- Reference project conventions and patterns
- Include relevant file paths or patterns
- Mention specific technologies used

### 5. Output Format
- Specify expected output format
- Use markdown formatting for structured responses
- Include examples of desired output

### 6. Error Handling
- Include fallback instructions
- Specify how to handle edge cases
- Provide guidance for ambiguous situations

## Skill Categories

### Development Skills
| Skill Name | Purpose |
|------------|---------|
| `create-component` | Generate new component with tests |
| `add-feature` | Implement a new feature end-to-end |
| `refactor` | Systematically refactor code |
| `debug` | Debug and fix issues |

### Research Skills
| Skill Name | Purpose |
|------------|---------|
| `explore` | Research a topic in the codebase |
| `find-patterns` | Discover usage patterns |
| `architecture` | Document architecture |
| `dependencies` | Analyze dependencies |

### Documentation Skills
| Skill Name | Purpose |
|------------|---------|
| `document` | Add documentation to code |
| `readme` | Update README files |
| `changelog` | Generate changelog entries |
| `api-docs` | Create API documentation |

### Testing Skills
| Skill Name | Purpose |
|------------|---------|
| `add-tests` | Generate test cases |
| `coverage` | Improve test coverage |
| `e2e-test` | Create end-to-end tests |
| `test-fix` | Fix failing tests |

### Review Skills
| Skill Name | Purpose |
|------------|---------|
| `review` | Code review with feedback |
| `security` | Security audit |
| `performance` | Performance analysis |
| `accessibility` | Accessibility review |

## Key Files

| File | Purpose |
|------|---------|
| `.claude/commands/*.md` | Project-level skill definitions |
| `~/.claude/commands/*.md` | User-level skill definitions |
| `.claude/settings.local.json` | Project-specific Claude settings |

## Skill Template

```markdown
# [Skill Name]

[Brief description of what this skill does]

## Context
[Any relevant project context or conventions]

## Instructions
[Step-by-step instructions for Claude to follow]

## Input
$ARGUMENTS

## Output Format
[Expected format of the response]

## Examples
[Optional: Examples of usage and expected output]
```

## Recommendations

### For Skill Organization
1. **Group related skills**: Use subdirectories for categories
2. **Consistent naming**: Use kebab-case for file names
3. **Version control**: Commit skills with the project
4. **Documentation**: Maintain a skills index

### For Skill Content
1. **Be specific**: Vague instructions produce vague results
2. **Include context**: Reference project patterns and conventions
3. **Iterate**: Refine skills based on usage
4. **Test thoroughly**: Verify skills work as expected

### For Skill Maintenance
1. **Review regularly**: Update skills as project evolves
2. **Remove unused**: Delete obsolete skills
3. **Consolidate**: Merge similar skills
4. **Share**: Document reusable patterns

## Integration with Project Workflow

Skills work best when integrated into development workflow:

1. **Onboarding**: Create skills that help new developers
2. **Standards**: Encode project conventions in skills
3. **Automation**: Use skills for repetitive tasks
4. **Quality**: Build review and testing skills

## Open Questions

1. **Skill Sharing**: How to share skills across projects? Currently requires manual copying.

2. **Skill Composition**: Can skills invoke other skills? Not directly supported.

3. **Conditional Logic**: How to handle branching logic in skills? Use clear instructions for Claude to follow.

4. **Output Persistence**: Should skills auto-save outputs? Currently requires manual save.

5. **Skill Testing**: How to test skills automatically? Consider creating test prompts.

6. **Version Compatibility**: How to handle skill changes across Claude Code versions?
