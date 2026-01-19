#!/bin/bash
#
# update-registry.sh - Atomically update workstream registry
#
# Usage:
#   update-registry.sh <workstream-id> <field> <value>
#   update-registry.sh <workstream-id> --state <state>
#   update-registry.sh <workstream-id> --assign <instance-id>
#   update-registry.sh <workstream-id> --unassign
#   update-registry.sh <workstream-id> --phase <current>/<total>
#   update-registry.sh <workstream-id> --merged
#
# Examples:
#   update-registry.sh my-feature --state implementing
#   update-registry.sh my-feature --assign session-abc123
#   update-registry.sh my-feature --phase 2/5
#   update-registry.sh my-feature --merged
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_FILE="${SCRIPT_DIR}/../workstreams.json"
TEMP_FILE="${REGISTRY_FILE}.tmp.$$"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    echo "Install with: brew install jq"
    exit 1
fi

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: update-registry.sh <workstream-id> <operation> [value]"
    echo ""
    echo "Operations:"
    echo "  --state <state>       Set workstream state"
    echo "  --assign <instance>   Assign to instance"
    echo "  --unassign            Clear instance assignment"
    echo "  --phase <N>/<M>       Set phase progress"
    echo "  --merged              Mark as merged with timestamp"
    echo "  --branch <name>       Set implementation branch"
    echo "  --worktree <path>     Set worktree path"
    exit 1
fi

WORKSTREAM_ID="$1"
OPERATION="$2"
VALUE="${3:-}"

# Check registry file exists
if [ ! -f "$REGISTRY_FILE" ]; then
    echo "Error: Registry file not found: $REGISTRY_FILE"
    exit 1
fi

# Check workstream exists
if ! jq -e ".workstreams[\"$WORKSTREAM_ID\"]" "$REGISTRY_FILE" > /dev/null 2>&1; then
    echo "Error: Workstream '$WORKSTREAM_ID' not found in registry."
    echo ""
    echo "Available workstreams:"
    jq -r '.workstreams | keys[]' "$REGISTRY_FILE" | head -10
    exit 1
fi

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build jq update expression based on operation
case "$OPERATION" in
    --state)
        if [ -z "$VALUE" ]; then
            echo "Error: --state requires a value"
            exit 1
        fi
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].state = \"$VALUE\" | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --assign)
        if [ -z "$VALUE" ]; then
            echo "Error: --assign requires an instance ID"
            exit 1
        fi
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].implementation.assignedInstance = \"$VALUE\" | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --unassign)
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].implementation.assignedInstance = null | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --phase)
        if [ -z "$VALUE" ]; then
            echo "Error: --phase requires a value like 2/5"
            exit 1
        fi
        CURRENT=$(echo "$VALUE" | cut -d'/' -f1)
        TOTAL=$(echo "$VALUE" | cut -d'/' -f2)
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].implementation.currentPhase = $CURRENT | .workstreams[\"$WORKSTREAM_ID\"].implementation.totalPhases = $TOTAL | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --merged)
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].state = \"merged\" | .workstreams[\"$WORKSTREAM_ID\"].mergedAt = \"$TIMESTAMP\" | .workstreams[\"$WORKSTREAM_ID\"].implementation.assignedInstance = null | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --branch)
        if [ -z "$VALUE" ]; then
            echo "Error: --branch requires a branch name"
            exit 1
        fi
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].implementation.branch = \"$VALUE\" | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    --worktree)
        if [ -z "$VALUE" ]; then
            echo "Error: --worktree requires a path"
            exit 1
        fi
        JQ_EXPR=".workstreams[\"$WORKSTREAM_ID\"].implementation.worktree = \"$VALUE\" | .workstreams[\"$WORKSTREAM_ID\"].updated = \"$TIMESTAMP\" | .lastUpdated = \"$TIMESTAMP\""
        ;;
    *)
        echo "Error: Unknown operation '$OPERATION'"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Perform atomic update
# 1. Apply jq transformation to temp file
jq "$JQ_EXPR" "$REGISTRY_FILE" > "$TEMP_FILE"

# 2. Verify the temp file is valid JSON
if ! jq empty "$TEMP_FILE" 2>/dev/null; then
    echo "Error: Invalid JSON generated. Aborting update."
    rm -f "$TEMP_FILE"
    exit 1
fi

# 3. Atomically replace original file
mv "$TEMP_FILE" "$REGISTRY_FILE"

# Report success
echo "Registry updated: $REGISTRY_FILE"
echo "  Workstream: $WORKSTREAM_ID"
echo "  Operation: $OPERATION ${VALUE:-}"
echo "  Timestamp: $TIMESTAMP"
