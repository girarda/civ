#!/bin/bash
#
# update-heartbeat.sh - Update instance heartbeat in the registry
#
# This hook should be called periodically to indicate the instance is still active.
# It updates the lastHeartbeat timestamp for the current instance.
#
# Usage:
#   Called automatically by Claude Code hooks, or manually:
#   .claude/hooks/update-heartbeat.sh [instance-id]
#
# If no instance-id is provided, it will try to detect the current session
# from environment variables or the instances.json file.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCES_FILE="${SCRIPT_DIR}/../../.swarm/instances.json"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    # Silently exit if jq is not available (don't break workflows)
    exit 0
fi

# Check if instances file exists
if [ ! -f "$INSTANCES_FILE" ]; then
    # No instances file yet, nothing to update
    exit 0
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine instance ID
INSTANCE_ID="${1:-${CLAUDE_SESSION_ID:-}}"

if [ -z "$INSTANCE_ID" ]; then
    # Try to find current instance by looking at active workstreams
    # This is a fallback and may not always work
    exit 0
fi

# Check if this instance exists in the registry
if ! jq -e ".instances[\"$INSTANCE_ID\"]" "$INSTANCES_FILE" > /dev/null 2>&1; then
    # Instance not registered, nothing to update
    exit 0
fi

# Create temp file for atomic update
TEMP_FILE="${INSTANCES_FILE}.tmp.$$"

# Update heartbeat
jq ".instances[\"$INSTANCE_ID\"].lastHeartbeat = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\"" "$INSTANCES_FILE" > "$TEMP_FILE"

# Verify the temp file is valid JSON
if ! jq empty "$TEMP_FILE" 2>/dev/null; then
    rm -f "$TEMP_FILE"
    exit 1
fi

# Atomic replace
mv "$TEMP_FILE" "$INSTANCES_FILE"

# Silent success (hook should not produce output during normal operation)
exit 0
