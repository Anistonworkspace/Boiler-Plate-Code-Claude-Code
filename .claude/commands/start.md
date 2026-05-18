---
name: start
description: Load full project context at the start of any new chat or after a context reset. ALWAYS run this first before doing any work.
---

Run this as the very first command in any new chat session.

Invokes the agent-memory agent in "session START" mode. It will:

1. Read memory/INDEX.md and summarize the project orientation
2. Read memory/project-state.md and report: what is built, what is pending, known issues
3. Read memory/coordination/locks.md and report any active file locks
4. Read memory/coordination/handoffs.md and report any OPEN handoffs available to pick up
5. Scan memory/plans/_active/ and list any in-flight plans by title
6. Report: "Context loaded. <N> open plans, <N> active locks, <N> open handoffs."

After running /start you will know:
- The exact state of the project
- Whether another agent is working on the same files (lock check)
- Whether you should pick up an existing handoff instead of starting fresh
- What was recently completed (last 3 change log entries)

Use /start:
- At the beginning of every new chat
- After a context-compaction event (when the conversation is auto-summarized)
- When picking up work started by another agent
- Whenever you feel you are operating on stale assumptions
