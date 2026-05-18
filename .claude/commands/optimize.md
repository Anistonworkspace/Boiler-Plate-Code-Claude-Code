# /optimize — Find and Fix Performance Issues

Invokes `agent-performance` to audit a specific area of the codebase for N+1 queries, missing indexes, slow endpoints, large bundle chunks, and unoptimized renders.

---

## Usage

```
/optimize <target>
```

Examples:
- `/optimize employee list endpoint`
- `/optimize dashboard page`
- `/optimize prisma queries in leave module`
- `/optimize frontend bundle`
- `/optimize socket.io broadcasting`

---

## What this checks

### Backend (Prisma / API)
- **N+1 queries** — `findMany` inside a loop without `include`; rewrite with nested `include` or a single joined query
- **Missing indexes** — columns used in `where`, `orderBy`, or `groupBy` that lack `@@index` in schema.prisma
- **Unpaginated endpoints** — list routes that return all rows without `?page=&limit=`; add pagination
- **Missing `select`** — fetching full models when only 2-3 fields are needed; add `select: {}` to reduce payload
- **Prisma `count` + `findMany` on same table** — rewrite as a single `$transaction([count, findMany])` to halve round trips
- **Soft-delete filter missing** — `{ deletedAt: null }` missing from where clause causing full-table scans
- **Redis cache candidates** — expensive queries run on every request that could be cached with a short TTL

### Frontend (React / RTK Query)
- **Missing `keepUnusedDataFor`** — RTK Query endpoints that re-fetch on every navigation
- **Missing `React.memo`** — list items that re-render on every parent state change
- **Missing virtualization** — lists > 100 items that render all DOM nodes at once; suggest `@tanstack/react-virtual`
- **Bundle analysis** — large imports that should be lazy-loaded (route-level code splitting already in router.tsx)
- **Framer Motion** — animations that block the main thread; move to `transform`/`opacity` only

### Socket.io
- **Broadcasting to wrong room** — emitting to `org:<id>` when only 1 user needs the event (use `user:<id>` room instead)
- **Missing acknowledgements** — fire-and-forget emits that should confirm delivery

---

## Output format

```
## Performance Audit — [Target]

### Critical (fix before next deploy)
- [PERF-001] N+1 in employee.service.ts:45 — adds 50ms per request at 100 employees
  Fix: add include: { department: true } to the findMany call

### High
- [PERF-002] Missing index on Leave.status — full table scan on approval list
  Fix: add @@index([organizationId, status]) to schema.prisma

### Medium
- [PERF-003] DashboardPage fetches on every tab switch — set keepUnusedDataFor: 300
```

---

## Rules that apply
- `.claude/rules/rule-database.md` — index conventions
- `.claude/rules/rule-api.md` — pagination requirements
- `.claude/rules/rule-frontend.md` — RTK Query cache settings
