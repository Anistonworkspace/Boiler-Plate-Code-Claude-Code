# Skill — Prisma Query Patterns

These are the only correct ways to write Prisma queries in this codebase.

---

## MANDATORY: organizationId on every query

```typescript
// ✅ ALWAYS include both organizationId AND deletedAt: null
const record = await prisma.employee.findFirst({
  where: { id, organizationId: actor.organizationId, deletedAt: null },
});

// ❌ IDOR vulnerability — missing organizationId
const record = await prisma.employee.findFirst({ where: { id } });
```

## Pagination (count + findMany in one transaction)

```typescript
const [data, total] = await prisma.$transaction([
  prisma.employee.findMany({
    where: { organizationId, deletedAt: null },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true }, // select only needed fields
  }),
  prisma.employee.count({ where: { organizationId, deletedAt: null } }),
]);
```

## Multi-table write (always use $transaction)

```typescript
// ✅ CORRECT — atomic
const result = await prisma.$transaction(async (tx) => {
  const record = await tx.employee.create({ data: { ... } });
  await tx.auditLog.create({ data: { ... } });
  return record;
});

// ❌ WRONG — two separate awaits can leave partial state
const record = await prisma.employee.create({ data: { ... } });
await prisma.auditLog.create({ data: { ... } }); // if this throws, audit is missing
```

## Optimistic lock for state machine transitions

```typescript
// ✅ CORRECT — prevents race conditions
const updated = await prisma.leave.updateMany({
  where: { id, status: 'PENDING', organizationId: actor.organizationId },
  data: { status: 'APPROVED', approverId: actor.id },
});
if (updated.count === 0) throw new ConflictError('Leave is no longer in PENDING state');

// ❌ WRONG — race condition window between find and update
const leave = await prisma.leave.findFirst({ where: { id } });
if (leave.status !== 'PENDING') throw new Error('...');
await prisma.leave.update({ where: { id }, data: { status: 'APPROVED' } });
```

## Including relations (avoid N+1)

```typescript
// ✅ CORRECT — single query with includes
const employees = await prisma.employee.findMany({
  where: { organizationId, deletedAt: null },
  include: { department: true, designation: true },
});

// ❌ WRONG — N+1: one query per employee
const employees = await prisma.employee.findMany({ where: { organizationId } });
for (const emp of employees) {
  emp.department = await prisma.department.findFirst({ where: { id: emp.departmentId } });
}
```

## Schema conventions reminder

```prisma
model MyModel {
  id             String    @id @default(uuid())   // always UUID
  organizationId String                           // always present
  // ... your fields
  createdAt      DateTime  @default(now())        // always
  updatedAt      DateTime  @updatedAt             // always
  deletedAt      DateTime?                        // soft delete — never hard delete

  @@index([organizationId])                       // always index orgId
}
```
