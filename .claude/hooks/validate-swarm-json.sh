#!/bin/bash
# Claude Code Hook: Validate .swarm/*.json files against schemas
# Triggered on: PostToolUse(Write)
#
# This hook validates any writes to .swarm/*.json files against their
# corresponding JSON schemas to prevent malformed registry data.

set -e

# Read hook input from stdin
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Exit early if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Only validate .swarm/*.json files
if [[ ! "$file_path" =~ \.swarm/[^/]+\.json$ ]]; then
  exit 0
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo "WARNING: jq not found, skipping JSON validation" >&2
  exit 0
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
  echo "WARNING: npx not found, skipping JSON validation" >&2
  exit 0
fi

# Determine project root
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Select schema based on filename
filename=$(basename "$file_path")
case "$filename" in
  workstreams.json)
    schema="$project_dir/.swarm/schemas/workstream.schema.json"
    ;;
  instances.json)
    schema="$project_dir/.swarm/schemas/instances.schema.json"
    ;;
  *)
    # Unknown file, skip validation
    exit 0
    ;;
esac

# Check if schema exists
if [ ! -f "$schema" ]; then
  echo "WARNING: Schema not found at $schema, skipping validation" >&2
  exit 0
fi

# Check if target file exists
if [ ! -f "$file_path" ]; then
  echo "WARNING: Target file not found at $file_path, skipping validation" >&2
  exit 0
fi

# Validate against schema using ajv-cli
# Use --strict=false to be lenient with format validation
validation_output=$(npx ajv validate -s "$schema" -d "$file_path" --spec=draft7 --strict=false 2>&1) || {
  echo "ERROR: JSON validation failed for $file_path" >&2
  echo "$validation_output" >&2
  echo "" >&2
  echo "The file must conform to the schema at: $schema" >&2
  exit 1
}

exit 0
