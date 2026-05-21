<!-- ═══════════════════════════════════════════════════════════════════════
     MANDATORY — READ BEFORE EVERY RESPONSE
     ═══════════════════════════════════════════════════════════════════════

  AUTO-DISPATCH: Before writing any code, check the task type and apply the
  matching agent(s) and skill(s) below. Do NOT wait for the user to name an
  agent — apply them automatically based on the task.

  | Task type                           | Apply agent(s)                        | Read skill(s)                    |
  |-------------------------------------|---------------------------------------|----------------------------------|
  | UI / component / page / design      | agent-ui-ux → agent-frontend-wiring   | skill-ui-ux-checklist.md         |
  | New module / scaffold / CRUD        | agent-planner → agent-code-review     | skill-mvc-patterns.md            |
  | Bug / error / crash / fix           | agent-debugger → agent-logic-analyzer | —                                |
  | Test / spec / coverage              | agent-testing → agent-test-writer     | skill-testing-patterns.md        |
  | Security / auth / RBAC / JWT        | agent-api-security → agent-security   | skill-auth-patterns.md           |
  | Database / migration / Prisma       | agent-database                        | skill-prisma-patterns.md         |
  | Deploy / CI / Docker / release      | agent-devops                          | —                                |
  | Performance / N+1 / paginate        | agent-performance                     | skill-prisma-patterns.md         |
  | Workflow / state machine / approval | agent-logic-analyzer                  | skill-state-machine-patterns.md  |
  | Code review / audit                 | agent-code-review                     | (all relevant skills)            |

  CORE RULES (always, no exceptions):
  1. MVC: Controller thin → Service thick → Prisma model (rule-mvc-architecture.md)
  2. Every Prisma query: organizationId + deletedAt:null (rule-security-rbac.md)
  3. Every API response: { success, data, meta } envelope (rule-api.md)
  4. No hardcoded hex colors — CSS variables only (skill-ui-ux-checklist.md)
  5. No .env commits, no APK in git, no secrets in code (rule-secrets-policy.md)

  CONTEXT RECOVERY: If this conversation starts with a compaction summary,
  run /compact-save IMMEDIATELY to save it to memory/sessions/compact/.
  Then run /start to reload full project state.
═══════════════════════════════════════════════════════════════════════════ -->

# Boilerplate App — AI Agent Entry Point

> **For freshers:** You don't need to read every file. Just describe what you want to build and the agents handle everything. Start with `/start`, then ask for what you need.

---

## What is this project?

Production-grade fullstack PWA boilerplate by **Aniston Technologies LLP**.
Use it as the starting point for any new application — all the scaffolding, tooling, agents, rules, and patterns are already set up.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui |
| State | Redux Toolkit + RTK Query |
| Animations | Framer Motion |
| Backend | Node.js + Express + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + BullMQ |
| Real-time | Socket.io |
| Mobile | Capacitor (Android APK/AAB + iOS IPA) |
| Desktop | Electron (Windows EXE) |
| Infra | Docker Compose + GitHub Actions + Nginx + PM2 |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| PWA | Workbox `injectManifest` strategy |

---

## CRITICAL RULES — Read These First

### 1. MVC Architecture is Mandatory
Every feature MUST follow the 4-layer pattern. See `.claude/rules/rule-mvc-architecture.md`.

```
Model     → prisma/schema.prisma          (data shape)
View      → frontend/src/features/<name>/ (React + RTK Query)
Controller→ backend/src/modules/<name>/<name>.controller.ts  (thin — parse, call, respond)
Service   → backend/src/modules/<name>/<name>.service.ts     (ALL business logic here)
```

### 2. Multi-Tenancy is Non-Negotiable
Every Prisma query on org-scoped data MUST include `organizationId: req.user.organizationId`.
The `organizationId` MUST come from the auth middleware — never from `req.body`.

### 3. No Git Worktrees
**NEVER use `isolation: "worktree"` or `git worktree add`.** All agents work in the main tree.

### 4. No Pushing Without Approval
**NEVER push code, create PRs, or deploy without explicit user approval.**

### 5. Use the Memory System
Every session: run `/start` first → work → run `/done` last. See `memory/INDEX.md`.

---

## How to Run

```bash
cd docker && docker compose up -d    # Start PostgreSQL + Redis
npm run dev:backend                  # Backend on :4000
npm run dev:frontend                 # Frontend on :5173
npm run dev                          # Both together
```

Key URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Swagger Docs: http://localhost:4000/api/docs
- Health check: http://localhost:4000/api/health
- Prisma Studio: `npm run db:studio`

---

## Slash Commands (type these in Claude Code)

| Command | What it does |
|---------|-------------|
| `/start` | Load all memory context before beginning work |
| `/done` | Save progress, update memory, release locks |
| `/compact-save` | Save compaction summary to memory (run immediately after context compaction) |
| `/build <module>` | Scaffold a complete MVC module (backend + frontend + tests) |
| `/audit` | Run all 10 audit dimensions across the entire codebase |
| `/trace <workflow>` | Trace a full UI → DB → socket workflow and find gaps |
| `/add-tests <target>` | Write real Vitest unit + Playwright E2E tests |
| `/explain <target>` | Explain any module layer-by-layer |
| `/optimize <target>` | Fix N+1 queries, missing indexes, slow renders |
| `/migrate <description>` | Run a safe database migration workflow |
| `/document <target>` | Write Swagger JSDoc + module README + ADR |
| `/security-scan` | Run OWASP Top 10 audit |
| `/release-check` | Final gate before any production deploy |
| `/fix <description>` | Fix a bug with a proper plan (P0–P3 severity) |

---

## Agents (auto-triggered — you don't invoke these manually)

| Agent | Auto-triggers when... |
|-------|----------------------|
| `agent-memory` | Session starts or ends, picking up a handoff |
| `agent-planner` | Any change touching > 1 file or > 10 lines |
| `agent-api-security` | Any route/middleware/auth file changes |
| `agent-code-review` | Before any commit or merge |
| `agent-debugger` | TypeScript errors, test failures, server crash |
| `agent-devops` | CI/CD, Docker, deploy script changes |
| `agent-docs` | New module built, Swagger missing, README missing |
| `agent-frontend-wiring` | New page/component, mutations added |
| `agent-logic-analyzer` | New workflow, state machine, approval flow |
| `agent-observability` | Logging gaps, health check issues |
| `agent-performance` | N+1 detected, pagination missing, bundle bloat |
| `agent-database` | Prisma schema changes, migrations |
| `agent-testing` | New module, coverage below threshold |
| `agent-refactor` | 3+ duplicate code blocks found |
| `agent-security` | `/security-scan`, auth changes, file uploads |
| `agent-test-writer` | `/add-tests`, new module with no tests |
| `agent-ui-ux` | New page/component, mobile layout issues |
| `agent-electron` | Electron desktop, IPC handlers, auto-update, NSIS installer |

---

## Skills Reference (agents read these for code patterns)

### Core Architecture
| Skill file | Contains |
|-----------|---------|
| `skill-mvc-patterns.md` | Controller/service/guard/pagination templates |
| `skill-prisma-patterns.md` | org scoping, $transaction, optimistic lock, N+1 fix |
| `skill-rtk-query-patterns.md` | API slice, providesTags, invalidatesTags, cache |
| `skill-auth-patterns.md` | JWT flow, requirePermission, self-approval guard |
| `skill-state-machine-patterns.md` | updateMany lock, terminal states, side effects |
| `skill-testing-patterns.md` | Service mocks, component tests, Playwright E2E |
| `skill-ui-ux-checklist.md` | Monday Aniston design system — all tokens, component primitives, animation timings, 24-section conformance checklist |

### Data & Communication
| Skill file | Contains |
|-----------|---------|
| `skill-socket-patterns.md` | Socket.io rooms, typed events, emit after transaction, RTK invalidation |
| `skill-background-jobs-patterns.md` | BullMQ queues, email/notification/export workers, retry/backoff |
| `skill-notification-patterns.md` | Notification model, socket real-time, unread count badge |
| `skill-caching-patterns.md` | Redis cache-aside, CacheKeys, TTL strategy, stampede prevention |
| `skill-webhook-patterns.md` | HMAC validation, outgoing retry, webhook log, event catalog |

### Security & Compliance
| Skill file | Contains |
|-----------|---------|
| `skill-encryption-patterns.md` | AES-256-GCM, field encryption, safeDecrypt, key rotation |
| `skill-audit-log-patterns.md` | AuditLog model, before/after snapshots, REDACTED fields, timeline UI |
| `skill-rbac-advanced-patterns.md` | Permission registry, ownership guards, manager scope, self-approval |
| `skill-input-sanitization-patterns.md` | DOMPurify XSS, file name sanitization, CSP headers, safe URLs |

### UI & Frontend
| Skill file | Contains |
|-----------|---------|
| `skill-form-patterns.md` | Create/edit forms, multi-step, field array, Zod cross-field |
| `skill-table-patterns.md` | DataTable, pagination, bulk action bar, mobile card fallback |
| `skill-modal-patterns.md` | Modal/drawer, delete confirm, edit form reset, portal |
| `skill-error-handling-patterns.md` | AppError hierarchy, Prisma mapper, global handler, frontend decoder |
| `skill-search-filter-patterns.md` | URL-synced filters, debounced search, scoped list query |
| `skill-chart-patterns.md` | Recharts line/bar/donut, KPI cards, date range picker, real-time |
| `skill-infinite-scroll-patterns.md` | Cursor pagination, IntersectionObserver, RTK Query merge, virtual list |

### Operations & Platform
| Skill file | Contains |
|-----------|---------|
| `skill-file-upload-patterns.md` | Multer, MIME+ext validation, sharp resize, auth-gated static serve |
| `skill-report-export-patterns.md` | PDFKit, ExcelJS, binary download mutation, large export via BullMQ |
| `skill-bulk-operations-patterns.md` | CSV import, bulk update/delete, partial failure, BullMQ progress |
| `skill-pwa-patterns.md` | Workbox, offline, install prompt, push notifications, update prompt |
| `skill-monitoring-patterns.md` | Winston structured logs, request ID, Sentry, health check, PM2 |
| `skill-multitenancy-patterns.md` | Org onboarding, subdomain routing, per-tenant config, plan gating |
| `skill-capacitor-patterns.md` | Android/iOS build, FCM push, camera, deep links, safe area |
| `skill-electron-patterns.md` | IPC, auto-update, tray, file dialogs, NSIS installer |
| `skill-i18n-patterns.md` | i18next, en-IN locale, plurals, date/currency format, RTL |
| `skill-rate-limiting-patterns.md` | Redis-backed rate limit, account lockout, 429 frontend handling |

---

## Rules Reference

| Rule file | Enforces |
|----------|---------|
| `rule-mvc-architecture.md` | 4-layer MVC pattern with code templates |
| `rule-backend.md` | Thin controllers, AppError, bcrypt, encryption |
| `rule-frontend.md` | RTK Query, React Hook Form, Tailwind only |
| `rule-api.md` | Response envelope, HTTP codes, pagination |
| `rule-security-rbac.md` | organizationId scoping, IDOR prevention, RBAC |
| `rule-database.md` | UUID IDs, soft delete, index requirements |
| `rule-database-migrations.md` | Production migration safety sequence |
| `rule-state-machines.md` | updateMany optimistic lock, terminal states |
| `rule-testing-standards.md` | 80%/70% coverage thresholds, RBAC matrix |
| `rule-logic-analysis.md` | 10-layer trace, enum completeness, side effects |
| `rule-audit-standards.md` | 10 audit dimensions, severity rubric |
| `rule-bug-fix-process.md` | P0–P3 fix plans with rollback |
| `rule-secrets-policy.md` | No .env commits, no APK in git |
| `rule-git-safety.md` | No force-push, no worktrees |
| `rule-memory-system.md` | Mandatory start/end sequences |
| `rule-naming-conventions.md` | camelCase/PascalCase/SCREAMING_SNAKE, file naming, route naming |
| `rule-logging-standards.md` | No console.log, structured JSON logs, requestId required, log levels |

---

## Database Commands

```bash
npm run db:generate    # Regenerate Prisma client (run after any schema change)
npm run db:push        # Push schema to DB — DEV ONLY, never production
npm run db:migrate     # Create a named migration file
npm run db:seed        # Seed with sample data
npm run db:studio      # Open Prisma Studio GUI at http://localhost:5555
```

---

## Architecture Docs

- `docs/architecture.md` — System diagram, request lifecycle, auth flow, queue architecture
- `docs/database-erd.md` — Entity relationship diagram for all Prisma models
- `docs/api-conventions.md` — Response envelope, HTTP codes, route naming, pagination

---

## Memory System

All persistent context lives in `memory/`. Every AI agent uses it.

```
memory/
  INDEX.md                    ← Start here — index of all memory
  project-state.md            ← Current state of the project
  decisions/                  ← Architecture Decision Records (ADRs)
  plans/_active/              ← In-progress implementation plans
  plans/_archive/             ← Completed plans
  changes/                    ← Daily change logs
  coordination/               ← locks.md, handoffs.md, shared-context.md
  prompts/                    ← Reusable prompt templates
```

---

## Fresher Quick Start

1. Open VS Code in this directory
2. Install recommended extensions (VS Code will prompt you)
3. Copy `.env.example` to `.env` and fill in your values
4. Run `cd docker && docker compose up -d`
5. Run `npm install` in the root
6. Run `npm run db:generate && npm run db:push && npm run db:seed`
7. Run `npm run dev`
8. Open Claude Code, type `/start`
9. Tell Claude what feature you want to build

**That's it. The agents do the rest.**

---

## Production Safety

- **NEVER** `db:push` in production → use `npx prisma migrate deploy`
- **NEVER** commit `.env` files → use `.env.example` with placeholder values
- **NEVER** commit APK/AAB/IPA/EXE artifacts → CI builds and deploys them
- **ALWAYS** backup the database before any migration
- **ALWAYS** run migrations BEFORE deploying new code
