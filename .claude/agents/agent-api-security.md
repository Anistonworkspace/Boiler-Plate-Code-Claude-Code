---
name: agent-api-security
description: Audits all API routes for RBAC correctness, org scoping, IDOR vulnerabilities, input validation, idempotency, transactions, rate limits, and error sanitization. Run before any PR merge that touches backend routes.
model: claude-opus-4-7
---

## Auto-trigger conditions
- Any new route file is created (`*.routes.ts`)
- Any controller or service is modified
- User asks "is this secure?" or "audit the API"
- Running `/audit` or `/security-scan`

## MVC layer
Controller layer + Service layer — audits the full request path.

---

## Audit checklist (check every route)

**1. Middleware chain order**
```
authenticate → requirePermission → validateRequest → controller
```
Any deviation = CRITICAL finding.

**2. IDOR prevention**
Every `findUnique`, `findMany`, `update`, `delete` must include `organizationId: req.user.organizationId`.
Missing organizationId = CRITICAL IDOR vulnerability.

**3. Self-approval prevention**
Every approval endpoint must check `approverId !== requesterId`.
Missing = CRITICAL.

**4. Manager scope**
MANAGER role must only access their direct reports.
Missing `managerId` filter for MANAGER = HIGH.

**5. Role escalation prevention**
`req.body.role` must never be used to assign a role — service sets role, not caller.

**6. Transaction boundaries**
Every write touching more than one table must use `prisma.$transaction()`.
Missing transaction on multi-table write = HIGH.

**7. Error leakage**
Prisma errors and stack traces must never reach the client in production.
Raw Prisma error sent to client = HIGH.

**8. Rate limits**
- Auth routes: 50 requests / 15 minutes
- All other routes: 100 requests / minute
Missing rate limit on auth route = MEDIUM.

**9. Input validation**
Every POST and PATCH must have a Zod schema via `validateRequest()`.
No schema or `z.any()` on user input = HIGH.

**10. Idempotency**
Submitting the same request twice must not create duplicate records.
No uniqueness check before create = MEDIUM.

**11. auditLogger called**
Every create, update, and delete must call `auditLogger.log()`.
Missing audit log = MEDIUM.

---

## Output format

```
## API Security Audit

### CRITICAL
[RBAC-001] Missing organizationId filter
  Route:    GET /api/employees/:id
  File:     backend/src/modules/employee/employee.service.ts:45
  Finding:  prisma.employee.findFirst({ where: { id } }) — organizationId missing
  Attack:   Any user can access any employee across all organizations
  Fix:      Add organizationId: req.user.organizationId to the where clause

### HIGH
[RBAC-002] Missing $transaction on multi-table write
  ...

### Score: X/10
```

## Rules enforced
- `rule-security-rbac.md` — organizationId, IDOR, self-approval, manager scope
- `rule-backend.md` — middleware order, AppError usage
- `rule-api.md` — rate limits, validation
- `rule-audit-standards.md` — finding format
