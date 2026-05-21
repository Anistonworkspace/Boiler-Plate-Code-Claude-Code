# Memory Index

**Always read this file first when starting work on this project.**

## Quick orientation

- Project: **Boilerplate App** — Production-grade fullstack PWA boilerplate
- Owner: Aniston Technologies LLP
- Stack: React 18 + Vite + Tailwind + RTK Query · Express + Prisma + PostgreSQL + Redis + BullMQ + Socket.io · Electron · Capacitor
- Project conventions: see [conventions.md](conventions.md) and `.claude/rules/`
- Current state: see [project-state.md](project-state.md)
- Recent sessions: see [sessions/](sessions/) | Compaction recoveries: [sessions/compact/](sessions/compact/)

## Start-of-work checklist

When an agent (or fresh chat) begins, do these in order:

1. Read [project-state.md](project-state.md) → know what's built, what's pending, what's broken.
2. Read [coordination/locks.md](coordination/locks.md) → know which files other agents are editing right now.
3. Read [coordination/shared-context.md](coordination/shared-context.md) → pick up cross-agent learnings.
4. Read [coordination/handoffs.md](coordination/handoffs.md) → check if another agent left a task for you.
5. Scan [plans/_active/](plans/_active/) → see if there's an in-flight plan you should continue.
6. Skim recent [changes/](changes/) entries (last 2-3 days) → understand recent code shifts.
7. Read relevant [decisions/](decisions/) ADRs for the area you'll touch.
8. Check [sessions/compact/](sessions/compact/) for the latest compaction save — if one exists from today, read it to recover mid-session context.

Only then start the user's task.

## End-of-work checklist

When wrapping up a task:

1. Update [project-state.md](project-state.md) with what changed.
2. Append today's changes to `changes/YYYY-MM-DD-changes.md`.
3. Release any file locks you held in [coordination/locks.md](coordination/locks.md).
4. If you learned something the next agent should know → write to [coordination/shared-context.md](coordination/shared-context.md).
5. If you started but didn't finish → write a handoff in [coordination/handoffs.md](coordination/handoffs.md) and leave the plan in `plans/_active/`.
6. Move any completed plan from `plans/_active/` to `plans/_archive/`.

## Map of important files

| What | Where |
|---|---|
| Project instructions for AI | `/CLAUDE.md`, `/AGENTS.md` |
| Code conventions (binding rules) | `/.claude/rules/*.md` |
| Available agents | `/.claude/agents/*.md` |
| Quick slash-commands | `/.claude/commands/*.md` |
| Tech stack & architecture decisions | [decisions/](decisions/) |
| Session logs (auto-written by /done) | [sessions/](sessions/) |
| Context compaction saves | [sessions/compact/](sessions/compact/) |
| Glossary of project terms | [glossary.md](glossary.md) |
| Prisma schema | `/prisma/schema.prisma` |
| RBAC permissions matrix | `/shared/src/permissions.ts` |
| Backend module pattern reference | `/backend/src/modules/auth/` |
| Frontend feature pattern reference | `/frontend/src/features/auth/` |

## Active counts (update when changed)

- Backend modules: 1 (auth)
- Frontend features: 2 (auth, dashboard)
- Prisma models: 7 (Organization, User, RefreshToken, Department, Designation, Employee, AuditLog)
- ADRs recorded: 8 (ADR-0001 through ADR-0008 — ADR-0002 superseded by ADR-0008)
- Skills: 39 (in .claude/skills/) — +skill-email-patterns, +skill-ci-cd-patterns
- Rules: 17 (in .claude/rules/)
- Agents: 19 (in .claude/agents/) — includes agent-electron + agent-logic-creator
- Commands: 17 (in .claude/commands/) — +project-init
- Open plans in `_active/`: 0
- Active file locks: 0
