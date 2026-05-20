# Skill — Search, Filter, and Sort Patterns

One unified query builder pattern for all list endpoints. Never write ad-hoc WHERE clauses.

---

## Backend — Validation schema (shared)

```typescript
// shared/src/schemas/common.schema.ts — extend these for each module
import { z } from 'zod';

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const BaseListQuerySchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
  search:  z.string().trim().max(200).optional(),
  from:    z.string().datetime().optional(),  // ISO 8601
  to:      z.string().datetime().optional(),
  sortBy:  z.string().optional(),
  sortDir: SortOrderSchema,
});

// Module-specific: extend and add allowed sortBy values
export const LeaveRequestListSchema = BaseListQuerySchema.extend({
  status:       z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  departmentId: z.string().uuid().optional(),
  type:         z.enum(['ANNUAL', 'SICK', 'UNPAID']).optional(),
  sortBy:       z.enum(['createdAt', 'startDate', 'status']).default('createdAt'),
});
export type LeaveRequestListQuery = z.infer<typeof LeaveRequestListSchema>;
```

---

## Backend — Service list method (canonical pattern)

```typescript
// The complete, production-ready list method
static async list(query: LeaveRequestListQuery, actor: AuthUser) {
  const { page, limit, search, status, departmentId, type, from, to, sortBy, sortDir } = query;

  // ── Build where clause ──────────────────────────────────────────────────
  const where: Prisma.LeaveRequestWhereInput = {
    organizationId: actor.organizationId,
    deletedAt: null,
  };

  // Manager scope — only their team
  if (actor.role === UserRole.MANAGER) {
    where.employee = { managerId: actor.employeeId };
  }

  // Employee scope — only their own
  if (actor.role === UserRole.EMPLOYEE) {
    where.employeeId = actor.employeeId;
  }

  // Enum filters
  if (status)       where.status       = status;
  if (type)         where.type         = type;
  if (departmentId) where.departmentId = departmentId;

  // Date range — on createdAt or any date field
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

  // Full-text search — case-insensitive substring on multiple fields
  if (search) {
    where.OR = [
      { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      { employee: { lastName:  { contains: search, mode: 'insensitive' } } },
      { reason:   { contains: search, mode: 'insensitive' } },
    ];
  }

  // ── Build orderBy ───────────────────────────────────────────────────────
  const orderBy: Prisma.LeaveRequestOrderByWithRelationInput =
    sortBy ? { [sortBy]: sortDir } : { createdAt: 'desc' };

  // ── Execute count + data in one transaction ─────────────────────────────
  const [data, total] = await prisma.$transaction([
    prisma.leaveRequest.findMany({
      where,
      orderBy,
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

---

## Backend — Routes (expose all query params)

```typescript
employeeRouter.get(
  '/',
  authenticate,
  requirePermission('LEAVE_VIEW'),
  validateRequest({ query: LeaveRequestListSchema }),
  LeaveRequestController.list,
);
```

---

## Frontend — RTK Query with all filters

```typescript
// frontend/src/features/leave-request/leaveRequestApi.ts
import type { LeaveRequestListQuery } from '@boilerplate/shared';

export const leaveRequestApi = createApi({
  reducerPath: 'leaveRequestApi',
  baseQuery,
  tagTypes: ['LeaveRequest'],
  endpoints: (builder) => ({
    getLeaveRequests: builder.query<PaginatedResponse<LeaveRequest>, LeaveRequestListQuery>({
      query: (params) => ({
        url: '/leave-requests',
        params,   // RTK Query serializes the object to query string automatically
      }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'LeaveRequest' as const, id })),
             { type: 'LeaveRequest', id: 'LIST' }]
          : [{ type: 'LeaveRequest', id: 'LIST' }],
    }),
  }),
});
```

---

## Frontend — Filter state with URL sync

```typescript
// frontend/src/features/leave-request/useLeaveFilters.ts
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

export function useLeaveFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<LeaveRequestListQuery>(() => ({
    page:    Number(searchParams.get('page'))    || 1,
    limit:   Number(searchParams.get('limit'))   || 20,
    search:  searchParams.get('search')          || undefined,
    status:  (searchParams.get('status') as any) || undefined,
    sortBy:  searchParams.get('sortBy')          || 'createdAt',
    sortDir: (searchParams.get('sortDir') as any) || 'desc',
    from:    searchParams.get('from')            || undefined,
    to:      searchParams.get('to')              || undefined,
  }), [searchParams]);

  const setFilter = (key: string, value: string | undefined) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.set('page', '1');  // reset page on filter change
      return next;
    });
  };

  return { filters, setFilter };
}
```

---

## Frontend — Search input with debounce

```typescript
import { useState, useEffect } from 'react';

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 300);  // 300ms debounce
    return () => clearTimeout(timer);
  }, [local, onChange]);

  return (
    <input
      className="input-field"
      placeholder="Search by name or reason..."
      value={local}
      onChange={e => setLocal(e.target.value)}
    />
  );
}
```

---

## Frontend — Filter bar component

```typescript
function LeaveFilterBar() {
  const { filters, setFilter } = useLeaveFilters();

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <SearchInput value={filters.search ?? ''} onChange={v => setFilter('search', v || undefined)} />

      <select className="input-field w-auto" value={filters.status ?? ''} onChange={e => setFilter('status', e.target.value || undefined)}>
        <option value="">All status</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>

      <input type="date" className="input-field w-auto" value={filters.from ?? ''} onChange={e => setFilter('from', e.target.value || undefined)} />
      <input type="date" className="input-field w-auto" value={filters.to   ?? ''} onChange={e => setFilter('to',   e.target.value || undefined)} />

      {/* Clear all filters */}
      {Object.values(filters).some(Boolean) && (
        <button className="btn btn--ghost btn--sm" onClick={() => setSearchParams({})}>Clear</button>
      )}
    </div>
  );
}
```

---

## Prisma index requirements for searchable/filterable fields

```prisma
model LeaveRequest {
  // ... other fields

  @@index([organizationId])
  @@index([status])                 // filtered by status
  @@index([departmentId])           // filtered by department
  @@index([employeeId])             // filtered by employee
  @@index([createdAt])              // sorted by createdAt
  @@index([organizationId, status]) // composite — most common combined filter
}
```

---

## Checklist

- [ ] List query schema extends `BaseListQuerySchema` with only the allowed sortBy enum values
- [ ] Manager scope restricts to `managerId` — never full org list
- [ ] Employee scope restricts to their own `employeeId`
- [ ] Count and data fetched in a single `prisma.$transaction([...])`
- [ ] Response includes `meta.total`, `meta.page`, `meta.limit`, `meta.totalPages`
- [ ] Search uses `mode: 'insensitive'` (case-insensitive in Postgres)
- [ ] Filter state is synced to URL (bookmarkable, shareable links)
- [ ] Search input has 300ms debounce
- [ ] Page resets to 1 on any filter change
- [ ] All filtered fields have a Prisma `@@index`
