#!/bin/bash
# PreToolUse hook — fires before every Bash tool call.
# Receives the tool call as JSON on stdin (NOT as $@ arguments).
# Blocks dangerous operations. Logs every command. Reminds about side effects.

set -uo pipefail

INPUT=$(cat)
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"

# ── Extract the bash command from stdin JSON ──────────────────────────────────
COMMAND=""
if command -v python3 &>/dev/null; then
  COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")
fi

# Fallback: grep for command field
if [ -z "$COMMAND" ]; then
  COMMAND=$(echo "$INPUT" | grep -oE '"command"\s*:\s*"[^"]*"' 2>/dev/null \
    | head -1 | sed 's/.*": "//' | sed 's/"$//' || echo "")
fi

# Log the command
echo "[$(date '+%Y-%m-%d %H:%M:%S')] CMD: $COMMAND" >> "$LOG_DIR/command-history.log"

# ── Safety blocks ─────────────────────────────────────────────────────────────

# Block accidental production db:push
if echo "$COMMAND" | grep -q "db:push" && echo "$COMMAND" | grep -qiE "prod|production"; then
  echo "BLOCKED: Never run db:push against production. Use: npx prisma migrate deploy"
  exit 2
fi

# Block wiping critical source directories
if echo "$COMMAND" | grep -qE "rm\s+-rf.*(prisma/|backend/src/|frontend/src/|shared/src/|\.claude/)"; then
  echo "BLOCKED: Cannot rm -rf critical source directories."
  exit 2
fi

# Block force-push to main/master
if echo "$COMMAND" | grep -qE "git push.*--force.*(main|master)"; then
  echo "BLOCKED: Force-push to main/master is not allowed per rule-git-safety.md"
  exit 2
fi

# Block piped remote execution
if echo "$COMMAND" | grep -qE "(curl|wget)\s+.*\|\s*(ba)?sh"; then
  echo "BLOCKED: Piping remote scripts to bash is a security risk."
  exit 2
fi

# Block writing to .env files directly via bash
if echo "$COMMAND" | grep -qE "echo\s+.*>.*\.env|tee\s+.*\.env|cat\s+.*>.*\.env"; then
  echo "BLOCKED: Do not write secrets to .env files via bash. Edit .env manually."
  exit 2
fi

# ── Reminders ─────────────────────────────────────────────────────────────────

# Remind about Prisma client after schema change
if echo "$COMMAND" | grep -qE "db:push|db:migrate"; then
  echo "REMINDER: Run 'npm run db:generate' after this to regenerate the Prisma client."
fi

# Remind to update memory after commit
if echo "$COMMAND" | grep -qE "git commit"; then
  echo "REMINDER: Run /done to update memory/project-state.md and log this session's changes."
fi

# Warn before any push
if echo "$COMMAND" | grep -qE "git push"; then
  echo "REMINDER: rule-git-safety.md — confirm the branch and diff before pushing."
fi

exit 0
