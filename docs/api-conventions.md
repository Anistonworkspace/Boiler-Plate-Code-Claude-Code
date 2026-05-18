# API Design Conventions

## Response envelope

Every API response uses the same envelope — success and error alike.

```typescript
// Success (single resource)
{ "success": true, "data": { "id": "...", "name": "..." } }

// Success (list)
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 243 }
}

// Error
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Employee not found"
  }
}
```

**Why:** Frontend RTK Query and mobile app can always destructure `data` or `error` without checking the response shape. A single pattern across 100+ endpoints means AI agents never have to guess the format.

## HTTP status codes

| Code | When to use |
|------|------------|
| 200 | GET / PATCH / DELETE success |
| 201 | POST — resource created |
| 400 | Validation error (Zod schema failed) |
| 401 | Not authenticated (no token, expired token) |
| 403 | Authenticated but forbidden (RBAC denied, wrong org) |
| 404 | Resource not found or soft-deleted |
| 409 | Conflict — duplicate or state machine violation |
| 429 | Rate limited |
| 503 | Downstream service unavailable (DB, Redis) |
| 500 | Unexpected server error — **never expose stack traces** |

## Route naming

```
GET    /api/<resource>          list (paginated)
POST   /api/<resource>          create
GET    /api/<resource>/:id      get one
PATCH  /api/<resource>/:id      update (partial)
DELETE /api/<resource>/:id      soft delete (sets deletedAt)
POST   /api/<resource>/:id/<action>  state machine transition
```

Example:
```
GET    /api/employees           list employees in org
POST   /api/employees           create employee
GET    /api/employees/:id       get one employee
PATCH  /api/employees/:id       update employee fields
DELETE /api/employees/:id       soft delete employee
POST   /api/employees/:id/activate    transition: INACTIVE → ACTIVE
```

## Middleware order — mandatory, never change

```
authenticate → requirePermission → validateRequest → controller
```

1. `authenticate` — verifies JWT, sets `req.user`
2. `requirePermission(X)` — checks `hasPermission(req.user.role, X)` against the permissions matrix
3. `validateRequest(Schema)` — Zod parses `req.body` / `req.params` / `req.query`, returns 400 on failure
4. controller — receives a clean, validated request with a known user

## Pagination

All list endpoints accept `?page=1&limit=20`.  
Always return `meta.total` so the frontend can calculate page count.

```typescript
const [data, total] = await prisma.$transaction([
  prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
  prisma.employee.count({ where: { organizationId, deletedAt: null } }),
]);
```

## Rate limits

| Route group | Window | Max requests |
|-------------|--------|-------------|
| `/api/auth/*` (login, register, forgot-password) | 15 minutes | 50 |
| All other routes | 1 minute | 100 |

## organizationId scoping — absolute rule

```typescript
// CORRECT — organizationId from the authenticated user
const employees = await prisma.employee.findMany({
  where: { organizationId: req.user.organizationId, deletedAt: null },
});

// WRONG — IDOR vulnerability, user can access another org's data
const employees = await prisma.employee.findMany({
  where: { organizationId: req.body.organizationId },
});
```

Never trust `organizationId` from the request body. The auth middleware sets `req.user.organizationId` from the verified JWT — use only that.

## Error codes (standard set)

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Request body failed Zod schema |
| `UNAUTHORIZED` | No token or invalid token |
| `FORBIDDEN` | Valid token but insufficient permissions |
| `NOT_FOUND` | Resource does not exist or is soft-deleted |
| `CONFLICT` | Duplicate record or invalid state transition |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |
