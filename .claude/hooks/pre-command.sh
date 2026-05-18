#!/bin/bash
# Runs before every Bash tool call. Blocks dangerous operations and reminds about side effects.
COMMAND="$@"
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] CMD: $COMMAND" >> "$LOG_DIR/command-history.log"

# Block accidental production db:push
if echo "$COMMAND" | grep -q "db:push" && echo "$COMMAND" | grep -q "prod"; then
  echo "BLOCKED: Never run db:push against production. Use: npx prisma migrate deploy"
  exit 1
fi

# Block wiping critical source directories
if echo "$COMMAND" | grep -qE "rm -rf.*(prisma/|backend/src/|frontend/src/|shared/src/)"; then
  echo "BLOCKED: Cannot rm -rf critical source directories."
  exit 1
fi

# Block force-push to main/master
if echo "$COMMAND" | grep -qE "git push.*--force.*(main|master)"; then
  echo "BLOCKED: Force-push to main/master is not allowed per rule-git-safety.md"
  exit 1
fi

# Remind about Prisma client after schema change
if echo "$COMMAND" | grep -qE "db:push|db:migrate"; then
  echo "REMINDER: Run 'npm run db:generate' after this to regenerate the Prisma client."
fi

# Remind to update memory at end of significant work
if echo "$COMMAND" | grep -qE "git commit"; then
  echo "REMINDER: Run /done to update memory/project-state.md and log this session's changes."
fi

exit 0
