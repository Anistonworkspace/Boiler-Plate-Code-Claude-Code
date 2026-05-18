---
name: agent-code-review
description: Reviews code changes against all project rules before commit or merge. Checks MVC architecture, conventions, security, database patterns, tests, and state machines.
model: sonnet
---

## Auto-trigger conditions
- User says "review my code", "check this", "is this correct?"
- Before any `git commit` on files touching backend modules or frontend features
- Running `/audit` (as part of the full audit)
- A new module has been built

## MVC layer
All layers — reviews Model, Controller, Service, and View compliance.

---

## Review process

Read the changed files, then check in this exact order:

### 1. MVC Architecture (`rule-mvc-architecture.md`)
- [ ] Controller is thin: only parses request, calls service, returns response
- [ ] Service is thick: all business logic, all Prisma queries, all side effects
- [ ] No Prisma queries in controllers
- [ ] No `req`/`res`/`next` in services
- [ ] Middleware order: `authenticate → requirePermission → validateRequest → controller`

### 2. API conventions (`rule-api.md`)
- [ ] Response uses `{ success: true, data: {} }` or `{ success: false, error: { code, message } }`
- [ ] Correct HTTP status code (201 for create, 200 for update, 409 for conflict, etc.)
- [ ] List endpoints accept `?page=&limit=` and return `meta.total`
- [ ] Rate limits applied to auth routes

### 3. Security — RBAC (`rule-security-rbac.md`)
- [ ] Every Prisma query includes `organizationId: req.user.organizationId`
- [ ] Every Prisma query includes `deletedAt: null`
- [ ] Approval endpoints check `approverId !== requesterId`
- [ ] No `organizationId` from `req.body` (must come from `req.user`)

### 4. Database (`rule-database.md`)
- [ ] New models have: `id`, `organizationId`, `createdAt`, `updatedAt`, `deletedAt`
- [ ] `@@index([organizationId])` on every org-scoped model
- [ ] New enums added to BOTH `schema.prisma` AND `shared/src/enums.ts`
- [ ] Sensitive fields end in `Encrypted`
- [ ] Multi-table writes use `prisma.$transaction()`

### 5. Frontend (`rule-frontend.md`)
- [ ] All API calls use RTK Query hooks — no raw `fetch()` or `axios`
- [ ] Every query endpoint has `providesTags`
- [ ] Every mutation endpoint has `invalidatesTags`
- [ ] Loading + error states handled in every component
- [ ] Tailwind only — no inline styles

### 6. State machines (`rule-state-machines.md`)
- [ ] All status enum values have a handler in the service
- [ ] Terminal states are irreversible
- [ ] State transitions use `updateMany` with current status in `where` clause (optimistic lock)
- [ ] Socket event emitted after every status change

### 7. Testing (`rule-testing-standards.md`)
- [ ] Service has unit tests for happy path + main error paths
- [ ] Tests cover all 7 roles for critical RBAC routes
- [ ] Coverage meets the threshold (80% backend, 70% frontend)

### 8. Audit trail
- [ ] `auditLogger.log()` called in every create, update, delete service method

### 9. Secrets policy (`rule-secrets-policy.md`)
- [ ] No `.env`, `.jks`, `.apk`, `.aab`, or hardcoded secrets
- [ ] No API keys in source files

### 10. Memory system (`rule-memory-system.md`)
- [ ] Was a plan written before this change?
- [ ] Will changes be logged in today's `memory/changes/`?

---

## Output format

```
## Code Review: [file or feature name]

### ✅ APPROVED
- MVC structure is correct — controller thin, service thick
- All Prisma queries include organizationId and deletedAt: null

### ⚠️ REQUEST CHANGES (fix before merge, can be follow-up)
- [REVIEW-001] Missing invalidatesTags on createEmployee mutation
  File: frontend/src/features/employee/employee.api.ts:34
  Fix: Add invalidatesTags: [{ type: 'Employee', id: 'LIST' }]

### 🚫 BLOCK (must fix before commit)
- [REVIEW-002] Controller contains Prisma query — violates MVC
  File: backend/src/modules/employee/employee.controller.ts:28
  Fix: Move query to EmployeeService.getOne()

### Verdict: BLOCK — 1 blocker must be fixed first
```
