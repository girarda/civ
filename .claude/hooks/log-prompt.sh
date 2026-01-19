#!/bin/bash
# Claude Code Hook: Log user prompts to JSONL files
# Triggered on: UserPromptSubmit

# Read JSON input from stdin
input=$(cat)

# Extract fields using jq (handles escaping properly)
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
timestamp=$(echo "$input" | jq -r '.timestamp // empty')

# Setup log directory
log_dir="$CLAUDE_PROJECT_DIR/.claude/logs"
mkdir -p "$log_dir"

# Create session-specific log file (JSONL format - one JSON per line)
session_log="$log_dir/session_${session_id}.jsonl"

# Append the full input JSON to session log
echo "$input" >> "$session_log"

# Also append to aggregate log across all sessions
all_log="$log_dir/all_prompts.jsonl"
echo "$input" >> "$all_log"

# Create/update session metadata file
metadata_file="$log_dir/session_${session_id}_metadata.json"
prompt_count=$(wc -l < "$session_log" | tr -d ' ')

cat > "$metadata_file" <<EOF
{
  "session_id": "$session_id",
  "first_prompt": $(head -n1 "$session_log" | jq -r '.timestamp // "unknown"'),
  "last_prompt": "$timestamp",
  "total_prompts": $prompt_count,
  "log_file": "$session_log"
}
EOF

# Exit 0 to allow the prompt to proceed
exit 0
