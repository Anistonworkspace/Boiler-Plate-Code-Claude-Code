# Boilerplate App

Production-grade fullstack PWA boilerplate by **Aniston Technologies LLP**.

Stack: React 18 · Vite · TypeScript · Tailwind CSS v3 · shadcn/ui · RTK Query · Framer Motion (frontend) | Express · Prisma · PostgreSQL 16 · Redis 7 · BullMQ · Socket.io (backend) | Capacitor (Android / iOS) · Electron (Windows desktop)

---

## Run in 5 minutes

```bash
# 1 — Clone and install
git clone <repo-url>
cd boilerplate-app
npm install                           # installs all workspaces

# 2 — Configure environment
cp .env.example .env
# Open .env and fill in these 5 required values:
#   DATABASE_URL  (postgres connection string)
#   JWT_SECRET    (any 32+ char random string)
#   JWT_REFRESH_SECRET (any 32+ char random string, different from above)
#   ENCRYPTION_KEY (exactly 64 hex chars — openssl rand -hex 32)
#   SMTP_HOST     (your email server, or leave blank to skip email)

# 3 — Start services
cd docker && docker compose up -d     # PostgreSQL + Redis
cd ..

# 4 — Set up database
npm run db:migrate                    # run migrations
npm run db:seed                       # create demo org + users

# 5 — Start development servers
npm run dev
# Frontend → http://localhost:5173
# Backend  → http://localhost:4000
# Swagger  → http://localhost:4000/api/docs
```

Run `/health` in Claude Code after starting to verify everything is wired up correctly.

---

## Using Claude Code (god mode)

### Install the extension
VS Code → Extensions → search **Claude Code** → Install → open a terminal → `claude`

### The two most important commands

| Command | What it does |
|---------|-------------|
| `/start` | **Always run this first.** Loads the full project context from `memory/` — Claude knows exactly what is built, what's pending, and what other agents are working on |
| `/done` | **Always run this before closing a chat.** Saves progress to `memory/` so the next session picks up exactly where you left off |

### All available commands

| Command | When to use |
|---------|-------------|
| `/start` | Start of every new chat |
| `/done` | End of every session |
| `/new-module <name>` | Scaffold a complete new feature (backend + frontend + DB) |
| `/explain <target>` | Understand how a module, flow, or feature works |
| `/trace <workflow>` | Full UI → DB → socket trace with gap detection |
| `/migrate <description>` | Safe database migration with danger checks |
| `/optimize <target>` | Find and fix N+1 queries, missing indexes, slow renders |
| `/add-tests <target>` | Write Vitest unit/integration + Playwright E2E tests |
| `/document <target>` | Generate Swagger JSDoc + module README + ADR |
| `/health` | Check the dev environment is running correctly |
| `/audit` | Full 10-dimension enterprise audit of the codebase |
| `/security-scan` | Security vulnerability scan (OWASP Top 10) |
| `/fix-critical` | Fix a P0/P1 critical bug with a safe plan |
| `/release-check` | Pre-release quality gate before deploying |
| `/deploy` | Deploy to production |

### All available agents

Agents are specialists. Claude automatically picks the right one, or you can ask for one directly:

| Agent | Ask for it when... |
|-------|-------------------|
| `agent-memory` | You want to load/save context, or check what other agents are doing |
| `agent-planner` | You want a plan written before starting a complex task |
| `agent-api-security` | You want every API route audited for RBAC, IDOR, and validation |
| `agent-code-review` | You want code reviewed before committing |
| `agent-debugger` | Something is broken and you don't know why |
| `agent-devops` | You want CI/CD, Docker, or deploy scripts audited |
| `agent-docs` | You want documentation written or updated |
| `agent-frontend-wiring` | You want dead buttons, broken modals, and API mismatches found |
| `agent-logic-analyzer` | You want business logic bugs and race conditions found |
| `agent-observability` | You want logging, health checks, and audit trails audited |
| `agent-performance` | You want N+1 queries, missing indexes, and slow endpoints found |
| `agent-database` | You want the Prisma schema and migrations audited |
| `agent-testing` | You want a test strategy and coverage gaps identified |
| `agent-refactor` | You want code duplication removed |
| `agent-security` | You want a full security audit (OWASP Top 10) |
| `agent-test-writer` | You want actual test files written (Vitest + Playwright) |
| `agent-ui-ux` | You want mobile layout, PWA, and accessibility audited |

### Example prompts for a new fresher

```
"I just cloned the repo. /start"

"/new-module invoice"

"The login button does nothing when clicked. Fix it."

"Add a dashboard page that shows total users and total revenue."

"/security-scan"

"/done"
```

---

## Memory system (how context is never lost)

The `memory/` folder is a persistent project brain that survives context resets, chat closings, and parallel agents.

```
memory/
  INDEX.md            ← master index, read this first
  project-state.md    ← what is built, what is pending, known issues
  conventions.md      ← all project conventions in one place
  coordination/
    locks.md          ← which files are being edited by which agent
    handoffs.md       ← tasks passed from one agent to another
    shared-context.md ← cross-agent learnings
  plans/_active/      ← in-flight plans (created before any non-trivial change)
  plans/_archive/     ← completed plans
  decisions/          ← architectural decision records (ADRs)
  changes/            ← daily changelog (the WHY behind each change)
```

**The rule:** `/start` at the beginning of every chat. `/done` at the end. Everything else is automatic.

---

## Project rules (what Claude always follows)

All rules live in `.claude/rules/`. A fresher can read these to understand exactly how the project must be built:

| File | What it enforces |
|------|-----------------|
| `rule-api.md` | API response format, HTTP codes, rate limits, pagination |
| `rule-backend.md` | Controller/service pattern, middleware order, security |
| `rule-database.md` | Prisma model conventions, UUID IDs, soft delete, indexes |
| `rule-frontend.md` | RTK Query only, Redux scope, forms, Tailwind only |
| `rule-security-rbac.md` | organizationId on every query, IDOR prevention, self-approval check |
| `rule-git-safety.md` | No push without approval, no worktrees, no force-push to main |
| `rule-secrets-policy.md` | What never goes in git, where secrets live |
| `rule-database-migrations.md` | Never db:push in production, migration sequence |
| `rule-state-machines.md` | Status field transitions, terminal states, optimistic locks |
| `rule-testing-standards.md` | Coverage requirements, what tests are required |
| `rule-bug-fix-process.md` | P0/P1 fix process, what every fix plan must include |
| `rule-audit-standards.md` | 10-dimension audit format, scoring rubric |
| `rule-logic-analysis.md` | How to trace full UI → DB workflows |
| `rule-memory-system.md` | Mandatory memory system protocol |

---

## Build for mobile / desktop (when the app is ready)

```bash
# Android APK + AAB
pwsh store-releases/android/build-android.ps1

# iOS IPA (macOS only)
bash store-releases/ios/build-ios.sh

# Windows EXE
pwsh store-releases/electron/build-electron.ps1
```

Each folder has a `PUBLISH_CHECKLIST.md`. Complete it before distributing.

---

## New employee checklist

- [ ] Clone the repo and run `npm install`
- [ ] Copy `.env.example` to `.env` and fill in the 5 required values
- [ ] Run `cd docker && docker compose up -d`
- [ ] Run `npm run db:migrate && npm run db:seed`
- [ ] Run `npm run dev` — verify both servers start
- [ ] Install the Claude Code VS Code extension
- [ ] Open a chat and type `/start`
- [ ] Read `memory/project-state.md` to see the current state of the project
- [ ] Read `GETTING_STARTED.md` for a guided walkthrough
- [ ] Read `CONTRIBUTING.md` before making your first commit

---

## Key URLs (local dev)

| URL | What it is |
|-----|-----------|
| http://localhost:5173 | Frontend PWA |
| http://localhost:4000/api/health | Backend health check |
| http://localhost:4000/api/docs | Swagger API documentation |
| http://localhost:5555 | Prisma Studio (database GUI) — run `npm run db:studio` |

---

## File structure

```
├── frontend/          React 18 + Vite PWA
│   ├── src/
│   │   ├── app/       Redux store + RTK Query base
│   │   ├── components/ui/  Button, Card, Input, Badge, Modal, Toast, etc.
│   │   ├── features/  One folder per feature (auth, dashboard, ...)
│   │   ├── hooks/     Shared React hooks
│   │   ├── lib/       utils.ts, animations.ts, socket.ts
│   │   └── router/    AppRouter with lazy loading + auth guards
├── backend/           Express + Prisma API server
│   └── src/
│       ├── modules/   One folder per feature (auth, employee, ...)
│       ├── middleware/ authenticate, requirePermission, validate, upload
│       ├── lib/       prisma.ts, redis.ts
│       ├── jobs/      BullMQ queues + workers
│       ├── sockets/   Socket.io server
│       └── utils/     encryption, auditLogger, pdfGenerator
├── shared/            Types, enums, permissions — used by both frontend + backend
├── prisma/            schema.prisma + migrations + seed.ts
├── docker/            docker-compose.yml
├── nginx/             nginx.conf (production)
├── store-releases/    Build scripts for Android / iOS / Electron
├── memory/            Persistent project memory (read by all agents)
└── .claude/           Claude Code configuration
    ├── rules/         rule-*.md — what the code must do
    ├── agents/        agent-*.md — specialist AI helpers
    └── commands/      Slash commands (/start, /done, /new-module, ...)
```
