#!/bin/bash
# Claude Code Hook: Verify worktree has registered workstream
# Triggered on: PostToolUse(Bash) for git worktree commands
#
# This hook warns (but does not block) when a worktree is created for
# a workstream that is not registered in the workstreams.json registry.
# This provides visibility without preventing emergency overrides.

# Note: This hook should NOT use set -e since we want to always exit 0
# (warn but don't block)

# Read hook input from stdin
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Exit early if no command
if [ -z "$command" ]; then
  exit 0
fi

# Only check git worktree add commands
if [[ ! "$command" =~ git[[:space:]]+worktree[[:space:]]+add ]]; then
  exit 0
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  exit 0
fi

# Extract branch name from command
# Patterns to match:
#   git worktree add -b feature/2026-01-18-name <path> <base>
#   git worktree add <path> -b feature/2026-01-18-name <base>
#   git worktree add <path> feature/2026-01-18-name
branch=$(echo "$command" | grep -oE 'feature/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-zA-Z0-9-]+' 2>/dev/null || true)

# Exit if not a feature branch
if [ -z "$branch" ]; then
  exit 0
fi

# Extract workstream ID from branch name (remove feature/ prefix and date)
# feature/2026-01-18-my-feature -> my-feature
ws_id=$(echo "$branch" | sed 's|feature/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-||')

# Exit if we couldn't extract an ID
if [ -z "$ws_id" ]; then
  exit 0
fi

# Determine project root
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Check if workstream exists in registry
registry="$project_dir/.swarm/workstreams.json"
if [ ! -f "$registry" ]; then
  echo ""
  echo "WARNING: Workstream registry not found at $registry"
  echo "Consider creating a workstream entry with /workstream-add"
  echo ""
  exit 0  # Warn but don't block
fi

# Check if workstream ID exists in registry
exists=$(jq -r --arg id "$ws_id" '.workstreams[$id] // empty' "$registry" 2>/dev/null)
if [ -z "$exists" ]; then
  echo ""
  echo "WARNING: Workstream '$ws_id' not found in registry."
  echo ""
  echo "The worktree was created, but this work may not be tracked properly."
  echo ""
  echo "To register this workstream, use:"
  echo "  /workstream-add \"$ws_id\" --title \"Description of work\""
  echo ""
  echo "Or if this is intentional, you can ignore this warning."
  echo ""
  # Exit 0 to not block - this is a warning, not an error
fi

exit 0
