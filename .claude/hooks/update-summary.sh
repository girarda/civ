#!/bin/bash
# Claude Code Hook: Update session summary after each response
# Triggered on: Stop (when Claude finishes responding)

# Read JSON input from stdin
input=$(cat)

# Extract fields
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')

# Setup log directory
log_dir="$CLAUDE_PROJECT_DIR/.claude/logs"
mkdir -p "$log_dir"

summary_file="$log_dir/session_${session_id}_summary.json"

# Read the transcript file to gather statistics
if [ -f "$transcript_path" ]; then
  # Count user prompts (lines with "role":"user")
  user_prompts=$(grep -c '"role":"user"' "$transcript_path" 2>/dev/null || echo 0)

  # Count assistant responses (lines with "role":"assistant")
  assistant_responses=$(grep -c '"role":"assistant"' "$transcript_path" 2>/dev/null || echo 0)

  # Get first and last timestamps from our prompt logs
  session_log="$log_dir/session_${session_id}.jsonl"
  if [ -f "$session_log" ]; then
    first_timestamp=$(head -n1 "$session_log" | jq -r '.timestamp // "unknown"')
    last_timestamp=$(tail -n1 "$session_log" | jq -r '.timestamp // "unknown"')
  else
    first_timestamp="unknown"
    last_timestamp="unknown"
  fi

  # Create summary JSON
  cat > "$summary_file" <<EOF
{
  "session_id": "$session_id",
  "first_interaction": "$first_timestamp",
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "statistics": {
    "user_prompts": $user_prompts,
    "assistant_responses": $assistant_responses,
    "total_turns": $((user_prompts + assistant_responses))
  },
  "files": {
    "transcript_path": "$transcript_path",
    "prompt_log": "$session_log",
    "summary_path": "$summary_file"
  }
}
EOF
fi

# Exit 0 to continue normal operation
exit 0
