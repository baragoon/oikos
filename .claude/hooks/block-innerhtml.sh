#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.js|*.mjs|*.html) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

MATCHES=$(grep -nE '\.innerHTML[[:space:]]*[+]?=[^=]' "$FILE_PATH" || true)

if [ -n "$MATCHES" ]; then
  jq -n --arg matches "$MATCHES" --arg path "$FILE_PATH" '{
    decision: "block",
    reason: ("innerHTML write detected in " + $path + ":\n" + $matches + "\n\nUse textContent, createElement, createElementNS, replaceChildren, or appendChild. See CLAUDE.md Hard Constraints."),
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: "Revert this change and use DOM APIs. The innerHTML ban has no exceptions — not even for static SVG sprite strings."
    }
  }'
  exit 0
fi

exit 0
