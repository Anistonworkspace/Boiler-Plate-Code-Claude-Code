#!/bin/bash
# Runs after every Edit/Write/MultiEdit. Reminds about side effects for key files.
FILE="$1"
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] EDIT: $FILE" >> "$LOG_DIR/edit-history.log"

# Prisma schema changed — client must be regenerated
if echo "$FILE" | grep -q "schema.prisma"; then
  echo "REMINDER: schema.prisma changed → run 'npm run db:generate' to update the Prisma client."
  echo "REMINDER: If you added a new enum, also update shared/src/enums.ts to keep them in sync."
fi

# Shared enums changed — both sides must stay in sync
if echo "$FILE" | grep -q "shared/src/enums"; then
  echo "REMINDER: shared/src/enums.ts changed → verify prisma/schema.prisma enums match."
fi

# Permissions map changed — update RBAC test matrix
if echo "$FILE" | grep -q "shared/src/permissions"; then
  echo "REMINDER: permissions.ts changed → update RBAC test matrix in affected __tests__ files."
fi

# Auth middleware changed — security-sensitive
if echo "$FILE" | grep -qE "middleware/(auth|requirePermission)"; then
  echo "REMINDER: Auth middleware changed → run agent-api-security audit before merging."
fi

# Memory system files changed
if echo "$FILE" | grep -q "memory/project-state"; then
  echo "INFO: project-state.md updated — changes will be visible to all future agents."
fi

# Environment config changed
if echo "$FILE" | grep -q "backend/src/config/env"; then
  echo "REMINDER: env.ts changed → update .env.example with any new variable names (never values)."
fi

exit 0
