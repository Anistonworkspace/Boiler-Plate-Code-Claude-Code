#!/bin/bash
# Runs when the agent stops (session end). Reminds about mandatory memory update.
LOG_DIR=".claude/logs"
mkdir -p "$LOG_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] SESSION END" >> "$LOG_DIR/command-history.log"

echo ""
echo "=== END-OF-SESSION CHECKLIST ==="
echo "1. Did you update memory/project-state.md with what changed?"
echo "2. Did you append to memory/changes/$(date '+%Y-%m-%d')-changes.md?"
echo "3. Did you release any locks in memory/coordination/locks.md?"
echo "4. If work is incomplete → write a handoff in memory/coordination/handoffs.md"
echo "5. If work is done → move the plan from memory/plans/_active/ to memory/plans/_archive/"
echo ""
echo "Run /done to do all of the above automatically."
echo "================================"
exit 0
