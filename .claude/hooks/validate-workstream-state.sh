#!/bin/bash
# Claude Code Hook: Validate workstream state transitions
# Triggered on: PostToolUse(Write) for workstreams.json
#
# This hook enforces blocking dependency constraints when a workstream
# transitions to the "implementing" state.

set -e

# Read hook input from stdin
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Exit early if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Only validate workstreams.json
if [[ "$(basename "$file_path")" != "workstreams.json" ]]; then
  exit 0
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo "WARNING: jq not found, skipping state transition validation" >&2
  exit 0
fi

# Check if file exists
if [ ! -f "$file_path" ]; then
  exit 0
fi

# Determine project root
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Get old version from git (or empty if new file)
# Use the project directory's git repo
old_json=$(cd "$project_dir" && git show HEAD:.swarm/workstreams.json 2>/dev/null || echo '{"workstreams":{}}')
new_json=$(cat "$file_path")

# Find workstreams transitioning to implementing
# Output format: one workstream ID per line
transitioning=$(echo "$old_json" "$new_json" | jq -rs '
  .[0].workstreams as $old |
  .[1].workstreams | to_entries[] |
  select(.value.state == "implementing") |
  select(($old[.key].state // "none") != "implementing") |
  .key
' 2>/dev/null || true)

# Exit if no workstreams transitioning
if [ -z "$transitioning" ]; then
  exit 0
fi

# Track if we found any blockers
found_blockers=false
error_output=""

# Check each transitioning workstream for unmet blockers
for ws_id in $transitioning; do
  # Get the dependencies array for this workstream, filter to blocking type,
  # and check if the target is not in merged state
  unmet_blockers=$(echo "$new_json" | jq -r --arg id "$ws_id" '
    .workstreams[$id].dependencies // [] |
    .[] |
    select(.type == "blocks") |
    .target as $target |
    if .workstreams[$target].state != "merged" then
      $target
    else
      empty
    end
  ' 2>/dev/null || true)

  # If there are unmet blockers, collect error information
  if [ -n "$unmet_blockers" ]; then
    found_blockers=true
    error_output="${error_output}ERROR: Cannot transition '$ws_id' to implementing.\n"
    error_output="${error_output}Unmet blocking dependencies:\n"

    for blocker in $unmet_blockers; do
      state=$(echo "$new_json" | jq -r --arg id "$blocker" '.workstreams[$id].state // "not found"')
      error_output="${error_output}  - $blocker (state: $state)\n"
    done
    error_output="${error_output}\nThe blocking workstreams must be in 'merged' state before this workstream can be claimed.\n"
    error_output="${error_output}To proceed anyway, ensure the blocking work is complete or remove the blocking dependency.\n\n"
  fi
done

# If we found any blockers, output errors and exit with failure
if [ "$found_blockers" = true ]; then
  echo -e "$error_output" >&2
  exit 1
fi

exit 0
