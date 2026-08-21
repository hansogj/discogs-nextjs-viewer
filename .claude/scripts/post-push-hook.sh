#!/usr/bin/env bash
# PostToolUse hook: detects git push to origin and delegates to ci-watchdog.
# Receives the full tool call as JSON on stdin.
DATA=$(cat)
CMD=$(echo "$DATA" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

if echo "$CMD" | grep -qE 'git[[:space:]].*push[[:space:]].*origin'; then
    exec bash "$(dirname "$0")/ci-watchdog.sh"
fi
