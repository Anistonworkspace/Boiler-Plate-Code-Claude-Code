#!/bin/bash
# Stop hook — fires when the agent finishes responding.
# 1. Logs session stop to .claude/logs/
# 2. Creates a session stub in memory/sessions/ — ONE per 60-minute window, not per response
# 3. Reminds Claude to run /done

set -uo pipefail

LOG_DIR=".claude/logs"
SESSION_DIR="memory/sessions"
mkdir -p "$LOG_DIR" "$SESSION_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H%M')

# Log the stop event
echo "[${TIMESTAMP}] SESSION STOP" >> "$LOG_DIR/command-history.log"

# ── Dedup: only create one stub per 60-minute window ─────────────────────────
# Find any session stub written in the last 60 minutes for today.
# Uses -mmin -60 (modification within last 60 minutes) — does NOT depend on
# command-history.log mtime, which was just updated and would break -newer checks.
RECENT=$(find "$SESSION_DIR" -name "${DATE}-*.md" -not -name "_template.md" \
  -mmin -60 2>/dev/null | head -1 || echo "")

if [ -z "$RECENT" ]; then
  SESSION_FILE="${SESSION_DIR}/${DATE}-${TIME}.md"
  cat > "$SESSION_FILE" << SESSIONEOF
# Session Log — ${DATE} ${TIME}

**Status:** UNSAVED — run /done to complete this log
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

> Auto-created by on-stop.sh. Run /done to save a proper session log with full context.
SESSIONEOF
fi

# ── End-of-session checklist ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        END-OF-SESSION CHECKLIST              ║"
echo "╠══════════════════════════════════════════════╣"
echo "║ 1. memory/project-state.md updated?         ║"
echo "║ 2. memory/changes/${DATE}-changes.md?       ║"
echo "║ 3. Locks released in locks.md?              ║"
echo "║ 4. Incomplete work? → write handoff          ║"
echo "║ 5. Done? → move plan to _archive/            ║"
echo "╠══════════════════════════════════════════════╣"
echo "║   Run /done to do all of this automatically  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

exit 0
