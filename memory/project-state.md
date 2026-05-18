# Project State

**Last updated:** 2026-05-18 (Phase 4 complete — MVC enforcement, skills directory, god-level agent rewrites)

---

## What is built

### Root & config
- ✅ `README.md` — god-mode entry point (commands, agents, quick start, file map)
- ✅ `CLAUDE.md` — project reference for Claude Code
- ✅ `AGENTS.md` — cross-tool agent guide (Claude Code + Codex compatible)
- ✅ `GETTING_STARTED.md` — step-by-step new employee guide
- ✅ `CONTRIBUTING.md` — branch naming, commits, PR checklist, agent usage
- ✅ `package.json` (npm workspaces: frontend, backend, shared)
- ✅ `tsconfig.base.json` — shared TS config
- ✅ `.gitignore`, `.env.example` (HRMS-specific vars removed, generic only)
- ✅ `ecosystem.config.cjs` — PM2 production config

### .claude/ configuration
- ✅ `settings.json` — model: sonnet, FastAPI removed, Stop hook added
- ✅ `settings.local.json`
- ✅ `hooks/pre-command.sh` — blocks dangerous ops, reminds about Prisma/memory
- ✅ `hooks/lint-on-save.sh` — reminds about schema/enum sync, auth sensitivity
- ✅ `hooks/on-stop.sh` — end-of-session memory checklist
- ✅ Rules (15 files, all prefixed `rule-`): rule-mvc-architecture (NEW), rule-api, rule-backend, rule-database, rule-frontend, rule-security-rbac, rule-git-safety, rule-secrets-policy, rule-database-migrations, rule-state-machines, rule-testing-standards, rule-bug-fix-process, rule-audit-standards, rule-logic-analysis, rule-memory-system
- ✅ Agents (17 files, all prefixed `agent-`, model: sonnet — all rewritten enterprise/god-level)
- ✅ Skills (6 files in `.claude/skills/`): skill-mvc-patterns, skill-prisma-patterns, skill-rtk-query-patterns, skill-auth-patterns, skill-state-machine-patterns, skill-testing-patterns
- ✅ Commands (15 files): start, done, new-module, audit, health, deploy, release-check, fix-critical, security-scan, explain, trace, migrate, optimize, add-tests, document
- ✅ Old stub files deleted (40 total)

### Infrastructure
- ✅ `docker/docker-compose.yml` — Postgres 16 + Redis 7, health checks, named volumes
- ✅ `docker/.env.docker` — Docker-level env vars template
- ✅ `nginx/nginx.conf` — HTTPS, SPA fallback, WebSocket upgrade, security headers, gzip
- ✅ `.github/workflows/ci.yml` — On PR: install, typecheck, test, build
- ✅ `.github/workflows/deploy.yml` — On main push: build → migrate → deploy → health check

### Shared package (`shared/`)
- ✅ `package.json`, `tsconfig.json`
- ✅ `enums.ts` — UserRole, UserStatus, EmploymentType, ApprovalStatus, AuditAction, NotificationType, JobQueueName
- ✅ `permissions.ts` — RBAC permissions matrix + `hasPermission()`
- ✅ `types.ts` — ApiResponse envelope, PaginationMeta, JwtPayload, AuthUser, LoginRequest/Response

### Backend (`backend/`)
- ✅ Skeleton: server.ts, app.ts, config/{env,swagger}, lib/{prisma,redis}
- ✅ Middleware: auth, errorHandler (+ AppError classes), validation, rateLimiter, requestLogger, upload
- ✅ Utils: encryption (AES-256-GCM), auditLogger, pdfGenerator, excelExporter
- ✅ Services: storage, email (BullMQ-backed)
- ✅ Jobs: queues + email/notification workers
- ✅ Sockets: JWT-authed Socket.io with org/user rooms
- ✅ Module: **auth** (login, refresh, logout, register, me) — full MVC
- ✅ `vitest.config.ts` — test config with 80% coverage threshold
- ✅ `src/test/setup.ts` — Vitest global setup
- ✅ `src/modules/auth/__tests__/auth.service.test.ts` — starter unit test with patterns

### Frontend (`frontend/`)
- ✅ Config: vite + PWA + Tailwind + PostCSS + Capacitor
- ✅ Entry: main.tsx, index.html, sw.ts (Workbox), globals.css (glassmorphism)
- ✅ Store: RTK + RTK Query with 401 auto-refresh
- ✅ Layout: AppShell, Sidebar, Topbar, ErrorBoundary
- ✅ Features: **auth** (slice, api, LoginPage), **dashboard** (api, page)
- ✅ Router: lazy + auth guards
- ✅ Hooks: useAuth, useAppDispatch, useAppSelector, useToast
- ✅ Lib: utils (cn, formatCurrency, formatDate), socket, animations (Framer Motion variants)
- ✅ UI primitives: Button, Input, Card, Badge, Skeleton, Tooltip, AnimatedModal, AnimatedPopover, Toast + barrel export
- ✅ `vitest.config.ts` — test config with 70% coverage threshold
- ✅ `src/test/setup.ts` — React Testing Library setup
- ✅ `public/offline.html` — glassmorphism offline fallback

### Database
- ✅ `prisma/schema.prisma` — 7 models with proper indexes
- ✅ `prisma/seed.ts` — Demo org + 3 users (SUPER_ADMIN, MANAGER, EMPLOYEE)

### Testing
- ✅ `backend/vitest.config.ts`
- ✅ `frontend/vitest.config.ts`
- ✅ `playwright.config.ts` — chromium + mobile-chrome projects
- ✅ `e2e/auth.spec.ts` — starter E2E tests for login flow + PWA

### Store releases
- ✅ `store-releases/android/` — build-android.ps1, .keystore-env.template, PUBLISH_CHECKLIST.md
- ✅ `store-releases/ios/` — build-ios.sh, ExportOptions.plist.template, PUBLISH_CHECKLIST.md
- ✅ `store-releases/electron/` — build-electron.ps1, PUBLISH_CHECKLIST.md

### Code quality gates
- ✅ `eslint.config.js` — flat config, TypeScript + React hooks rules
- ✅ `.prettierrc` + `.prettierignore` — consistent formatting
- ✅ `.editorconfig` — universal editor settings
- ✅ `lint-staged.config.js` + `.husky/pre-commit` — auto-lint before every commit
- ✅ Root `package.json` — lint, format, format:check, prepare scripts added

### Developer tooling
- ✅ `.vscode/settings.json` — format on save, ESLint auto-fix, Tailwind IntelliSense
- ✅ `.vscode/extensions.json` — 14 recommended extensions
- ✅ `.vscode/launch.json` — debug configs for backend + tests

### GitHub collaboration
- ✅ `.github/pull_request_template.md` — full PR checklist
- ✅ `.github/ISSUE_TEMPLATE/bug_report.md`
- ✅ `.github/ISSUE_TEMPLATE/feature_request.md`
- ✅ `.github/dependabot.yml` — weekly npm + monthly Actions updates

### Shared validation schemas
- ✅ `shared/src/schemas/auth.schema.ts` — Login, Register, ChangePassword, ForgotPassword, ResetPassword
- ✅ `shared/src/schemas/common.schema.ts` — Pagination, UuidParam, DateRange, Search, ListQuery
- ✅ Exported from `shared/src/index.ts` — usable in both frontend (zodResolver) and backend (z.parse)

### Architecture documentation
- ✅ `docs/architecture.md` — Mermaid system + request lifecycle + auth + queue diagrams
- ✅ `docs/database-erd.md` — Mermaid ERD of all 7 models
- ✅ `docs/api-conventions.md` — envelope, HTTP codes, route naming, pagination, error codes

### Reusable prompt templates
- ✅ `memory/prompts/new-module-template.md`
- ✅ `memory/prompts/bug-report-template.md`
- ✅ `memory/prompts/code-review-template.md`
- ✅ `memory/prompts/feature-spec-template.md`

### MCP server guide
- ✅ `.claude/mcp-recommended.md` — PostgreSQL, Filesystem, GitHub, Memory MCP servers

### Memory & coordination
- ✅ `memory/` system — fully operational

---

## What is pending (application features — build with /new-module)

- ⏳ Backend modules: employee, department, designation, settings (use `/new-module`)
- ⏳ Frontend feature pages for employee/department/designation/settings
- ⏳ Real PWA icons (192/512 + maskable variants) — currently placeholders
- ⏳ `agent-desktop/` — Electron Windows desktop app (optional)

---

## Known issues

| Issue | Severity | Notes |
|---|---|---|
| `npm install` not yet run | Info | Type errors in IDE resolve once deps install |
| Real PWA icons missing | Low | Placeholder icons, update before PWA launch |
| Docker passwords are dev defaults | Info | Change before any team deployment |

---

## How to start (new employee)

```
1. npm install
2. cp .env.example .env  →  fill 5 values
3. cd docker && docker compose up -d
4. npm run db:migrate && npm run db:seed
5. npm run dev
6. Open Claude Code → /start
```

---

## Conventions in force (binding)

See `.claude/rules/rule-*.md` — these are mandatory for all agents and all developers.
Key rules: no worktrees, API envelope, module pattern, organizationId on every query, AES-256-GCM, JWT httpOnly cookie, RTK Query only on frontend.
