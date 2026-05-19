#!/bin/bash
# Stop hook — fires when the agent finishes responding.
# 1. Logs session end timestamp to .claude/logs/
# 2. Creates a session stub in memory/sessions/ if none exists for this session
# 3. Reminds Claude to run /done if it hasn't already

set -uo pipefail

LOG_DIR=".claude/logs"
SESSION_DIR="memory/sessions"
mkdir -p "$LOG_DIR" "$SESSION_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H%M')
SESSION_FILE="${SESSION_DIR}/${DATE}-${TIME}.md"

# Log the stop event
echo "[${TIMESTAMP}] SESSION STOP" >> "$LOG_DIR/command-history.log"

# Create a session stub only if this session doesn't have one yet
# (Check: no session file for today that's less than 4 hours old)
RECENT=$(find "$SESSION_DIR" -name "${DATE}-*.md" -not -name "_template.md" \
  -newer "$LOG_DIR/command-history.log" 2>/dev/null | head -1 || echo "")

if [ -z "$RECENT" ]; then
  cat > "$SESSION_FILE" << SESSIONEOF
# Session Log — ${DATE} ${TIME}

**Status:** UNSAVED
**Stopped:** ${TIMESTAMP}

---

## What was worked on

<!-- Run /done to fill this in properly -->

---

## Files changed

<!-- Run /done to fill this in properly -->

---

## Incomplete work

- (Run /done to record any incomplete tasks)

---

> This stub was auto-created by on-stop.sh. Run /done to save a proper session log.
SESSIONEOF
fi

# Print checklist reminder
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     END-OF-SESSION CHECKLIST             ║"
echo "╠══════════════════════════════════════════╣"
echo "║ 1. memory/project-state.md updated?     ║"
echo "║ 2. memory/changes/${DATE}-changes.md?   ║"
echo "║ 3. Locks released in locks.md?          ║"
echo "║ 4. Incomplete work? → write handoff      ║"
echo "║ 5. Done? → move plan to _archive/        ║"
echo "╠══════════════════════════════════════════╣"
echo "║   Run /done to do all of this            ║"
echo "║   automatically + save session log.      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

exit 0
