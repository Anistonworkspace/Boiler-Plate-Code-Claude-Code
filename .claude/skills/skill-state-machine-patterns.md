# Skill — State Machine Patterns

---

## Define all states and transitions upfront

```typescript
// In <name>.service.ts — document before writing code
/*
 * Leave Request State Machine
 *
 * States:      DRAFT → SUBMITTED → APPROVED | REJECTED → CANCELLED (terminal)
 * Transitions:
 *   DRAFT → SUBMITTED   : employee submits (EMPLOYEE role)
 *   SUBMITTED → APPROVED: manager/admin approves (MANAGER, ADMIN)
 *   SUBMITTED → REJECTED: manager/admin rejects (MANAGER, ADMIN)
 *   APPROVED → CANCELLED: admin cancels (ADMIN only)
 * Terminal:    CANCELLED, REJECTED (cannot leave without explicit re-open)
 * Self-approval: BLOCKED — approverId !== requesterId enforced
 */
```

## Optimistic lock pattern (prevents race conditions — MANDATORY)

```typescript
// ✅ CORRECT — updateMany with current state in where clause
static async approve(id: string, actor: AuthUser) {
  const leave = await prisma.leave.findFirst({
    where: { id, organizationId: actor.organizationId, deletedAt: null },
  });
  if (!leave) throw new NotFoundError('Leave request not found');
  if (leave.requesterId === actor.id) throw new ForbiddenError('Cannot approve your own request');

  const updated = await prisma.leave.updateMany({
    where: { id, status: 'SUBMITTED' },  // ← current state in where clause
    data: { status: 'APPROVED', approverId: actor.id, approvedAt: new Date() },
  });

  if (updated.count === 0) {
    throw new ConflictError('Leave request is no longer in SUBMITTED state');
  }

  // Side effects after successful transition
  await notificationQueue.add('leave-approved', { leaveId: id, requesterId: leave.requesterId });
}

// ❌ WRONG — race condition between find and update
const leave = await prisma.leave.findFirst({ where: { id } });
if (leave.status !== 'SUBMITTED') throw new Error('...');
await prisma.leave.update({ where: { id }, data: { status: 'APPROVED' } }); // another request could have changed status here
```

## Terminal state guard

```typescript
// Guard at the start of every mutation service method
const TERMINAL_STATES = ['CANCELLED', 'REJECTED', 'COMPLETED'] as const;

static async update(id: string, dto: UpdateInput, actor: AuthUser) {
  const record = await this.getOne(id, actor);
  if (TERMINAL_STATES.includes(record.status as any)) {
    throw new ConflictError(`Cannot modify a ${record.status} request`);
  }
  // proceed
}
```

## Side effects after transition (MANDATORY pattern)

```typescript
// After every status change:
// 1. Audit log (inside transaction)
// 2. Socket emit (outside transaction)
// 3. Notification queue push (outside transaction)

const result = await prisma.$transaction(async (tx) => {
  const updated = await tx.leave.updateMany({ ... });
  await auditLogger.log(tx, { action: 'LEAVE_APPROVED', ... });
  return updated;
});

// Outside transaction — side effects
io.to(`org:${actor.organizationId}`).emit('leave:approved', { leaveId: id });
await notificationQueue.add('leave-approved', { leaveId: id });
```

## Frontend state machine (disable buttons based on status)

```typescript
// ✅ CORRECT — button availability tied to current state
const canApprove = leave.status === 'SUBMITTED' && hasPermission(user.role, 'LEAVE_APPROVE');
const canCancel = leave.status === 'APPROVED' && hasPermission(user.role, 'LEAVE_CANCEL');

<Button disabled={!canApprove} onClick={handleApprove}>Approve</Button>
<Button disabled={!canCancel} variant="destructive" onClick={handleCancel}>Cancel</Button>
```
