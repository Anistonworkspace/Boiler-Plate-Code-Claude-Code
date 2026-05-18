---
name: done
description: Save progress and update the memory system at the end of a work session. Run this before closing a chat or switching tasks.
---

Invokes the agent-memory agent in "session END" mode. It will:

1. Update memory/project-state.md to reflect everything built or changed this session
2. Append entries to today's memory/changes/YYYY-MM-DD-changes.md
3. For each in-flight plan: if complete → move to _archive/ with -DONE suffix; if incomplete → write a handoff
4. Mark any locks held this session as RELEASED in memory/coordination/locks.md
5. Add any cross-agent learnings to memory/coordination/shared-context.md
6. Report a summary of what was saved

After running /done, the next agent or fresh chat can pick up exactly where this session left off by running /start.

Use /done:
- Before closing a chat session
- Before switching to a different task or feature
- After completing a feature implementation
- As a safety checkpoint every ~30-60 minutes of active work
