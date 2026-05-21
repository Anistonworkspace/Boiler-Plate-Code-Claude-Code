#!/bin/bash
# PostToolUse hook — fires after every Edit/Write/MultiEdit tool call.
# Receives the tool call as JSON on stdin (NOT as $1 argument).
# Reminds about side effects for key files.

set -uo pipefail

INPUT=$(cat)
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"

# ── Extract the file path from stdin JSON ─────────────────────────────────────
FILE=""
if command -v python3 &>/dev/null; then
  FILE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # file_path is used by Edit and Write tools
    fp = data.get('tool_input', {}).get('file_path', '')
    print(fp)
except Exception:
    print('')
" 2>/dev/null || echo "")
fi

# Fallback: grep for file_path field
if [ -z "$FILE" ]; then
  FILE=$(echo "$INPUT" | grep -oE '"file_path"\s*:\s*"[^"]*"' 2>/dev/null \
    | head -1 | sed 's/.*": "//' | sed 's/"$//' || echo "")
fi

# Log the edit
echo "[$(date '+%Y-%m-%d %H:%M:%S')] EDIT: $FILE" >> "$LOG_DIR/edit-history.log"

# If we couldn't extract a path, nothing to check
if [ -z "$FILE" ]; then
  exit 0
fi

# ── File-specific reminders ───────────────────────────────────────────────────

# Prisma schema changed — client must be regenerated
if echo "$FILE" | grep -q "schema.prisma"; then
  echo "REMINDER: schema.prisma changed → run 'npm run db:generate' to update the Prisma client."
  echo "REMINDER: If you added a new enum, also update shared/src/enums.ts to keep them in sync."
fi

# Shared enums changed — both sides must stay in sync
if echo "$FILE" | grep -q "shared/src/enums"; then
  echo "REMINDER: shared/src/enums.ts changed → verify prisma/schema.prisma enums match exactly."
fi

# Permissions map changed — update RBAC test matrix
if echo "$FILE" | grep -q "shared/src/permissions"; then
  echo "REMINDER: permissions.ts changed → update RBAC test matrix in affected __tests__ files."
  echo "REMINDER: Check every route that uses requirePermission() — does the new permission need a new route guard?"
fi

# Auth middleware changed — security-sensitive
if echo "$FILE" | grep -qE "middleware/(auth|requirePermission|validate)"; then
  echo "REMINDER: Auth middleware changed → run agent-api-security audit before merging."
  echo "REMINDER: Verify middleware order: authenticate → requirePermission → validateRequest → controller"
fi

# Service file changed — audit log and transaction check
if echo "$FILE" | grep -qE "\.service\.ts$"; then
  echo "REMINDER: Service changed → verify all create/update/delete calls have auditLogger.log() inside \$transaction."
fi

# Route file changed — middleware order check
if echo "$FILE" | grep -qE "\.routes\.ts$"; then
  echo "REMINDER: Routes changed → verify middleware chain order: authenticate → requirePermission → validateRequest → controller"
fi

# Encryption utility changed — security-critical
if echo "$FILE" | grep -q "utils/encryption"; then
  echo "REMINDER: Encryption utility changed — run encrypt/decrypt round-trip test before deploying."
fi

# Memory system files changed
if echo "$FILE" | grep -q "memory/project-state"; then
  echo "INFO: project-state.md updated — all future agents will see the new state."
fi

# Environment config changed
if echo "$FILE" | grep -q "backend/src/config/env"; then
  echo "REMINDER: env.ts changed → update .env.example with any new variable names (never values)."
fi

# Hook files changed
if echo "$FILE" | grep -q ".claude/hooks/"; then
  echo "REMINDER: Hook script changed → test it manually: echo '{}' | bash .claude/hooks/<filename>.sh"
fi

# CI/CD changed
if echo "$FILE" | grep -q ".github/workflows/"; then
  echo "REMINDER: GitHub Actions workflow changed → validate with 'act' locally before pushing."
fi

exit 0
