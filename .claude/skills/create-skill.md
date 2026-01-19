---
name: create-skill-from-requirements
description: Creates a new Claude Code Agent Skill (custom slash-invocable Skill) from a requirements description. Use when the user asks to turn a workflow/prompt into a reusable Skill, including scope (project vs personal), file placement, and a ready-to-paste SKILL.md.
user-invocable: true
---

# Create Skill from Requirements

## Purpose
Turn the user’s requirements into a single, focused Claude Code **Skill** (directory + `SKILL.md`) that follows Claude’s Skill authoring best practices.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, infer the requirements from the user’s most recent message that requested a Skill conversion.

## Workflow
Copy this checklist into your response and mark items as you complete them:

- [ ] Parse the requirements and extract the core task.
- [ ] Choose Skill scope (project vs personal) using the rule below.
- [ ] Pick a kebab-case Skill name and directory.
- [ ] Draft YAML frontmatter (name, description; optional fields only if helpful).
- [ ] Write concise, step-by-step instructions with the right “degree of freedom”.
- [ ] Add input handling + error handling guidance.
- [ ] Specify an explicit expected output format.
- [ ] Provide: path, invocation, example usage, and customization suggestions.

## Scope rule (project vs personal)
Default to a **project Skill** in `.claude/skills/` unless the user explicitly requests a personal cross-project Skill in `~/.claude/skills/`.

## Naming & placement rules
1. Use **kebab-case** for the Skill directory and `name`.
2. Directory structure MUST be:
   - `.claude/skills/<skill-name>/SKILL.md` (project), OR
   - `~/.claude/skills/<skill-name>/SKILL.md` (personal)
3. The `description` MUST be **third person** and include:
   - what the Skill does
   - when to use it (keywords users will naturally say)

## Authoring rules (best practices)
- Be concise: assume Claude already knows general concepts; include only what’s needed for correct, repeatable execution.
- Set the right degree of freedom:
  - High freedom for analysis/review tasks.
  - Medium freedom with templates/structured steps for common variations.
  - Low freedom (exact commands/sequence) for fragile or high-stakes operations.
- Prefer progressive disclosure: keep `SKILL.md` short; if long reference material is needed, suggest additional files and link to them.
- Avoid time-sensitive assumptions (dates, “current” versions) unless explicitly required; if needed, instruct how to verify.

## Output requirements
Your response MUST include these four sections, in this exact order:

### 1) Created Skill Path
Provide the full target path (project or personal).

### 2) Skill File Contents
Output the complete `SKILL.md` contents in one code block.

### 3) How to Invoke
Explain both:
- Automatic activation: what kinds of user requests should trigger it
- Manual invocation: type `/` and select the Skill (since `user-invocable: true`), then pass arguments

### 4) Example Usage + Customization
Provide:
- 2–3 example invocations with realistic arguments
- 2–4 customization suggestions (e.g., add `allowed-tools`, add `context: fork`, add supporting files)

## Error handling guidance (include in the generated Skill)
In the generated Skill’s instructions, add a short “If unclear” section:
- Make reasonable assumptions and list them.
- If truly blocked, ask the minimum number of targeted questions (max 2).
- If the user asked for “best practices”, include a brief checklist inside the generated Skill.

