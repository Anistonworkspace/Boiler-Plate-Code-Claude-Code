# Skill: Workflow Orchestration Patterns

## Saga pattern (orchestration style)

Use when a workflow spans multiple services/modules and needs compensation on failure.
The **Orchestrator** drives every step and knows the full sequence.

```typescript
// backend/src/modules/onboarding/sagas/employee-onboarding.saga.ts
import { prisma } from '../../../lib/prisma.js';
import { emailQueue, notificationQueue } from '../../../jobs/queues.js';
import { auditLogger } from '../../../utils/auditLogger.js';
import { ConflictError } from '../../../middleware/errorHandler.js';
import type { AuthUser } from '@boilerplate/shared';

interface OnboardingInput {
  employeeId: string;
  departmentId: string;
  managerId: string;
  startDate: Date;
}

// Saga step result — explicit success/failure at each step
interface SagaStepResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EmployeeOnboardingSaga {
  private completedSteps: string[] = [];

  async execute(input: OnboardingInput, actor: AuthUser): Promise<void> {
    try {
      // Step 1: Assign to department
      await this.assignToDepartment(input, actor);

      // Step 2: Create user account
      const userId = await this.createUserAccount(input, actor);

      // Step 3: Set up leave balance
      await this.initializeLeaveBalance(input.employeeId, actor);

      // Step 4: Send welcome email
      await this.sendWelcomeEmail(input.employeeId, userId);

      // Step 5: Notify manager
      await this.notifyManager(input.managerId, input.employeeId, actor.organizationId);

    } catch (err) {
      // Compensate completed steps in reverse order
      await this.compensate(input, actor);
      throw err;
    }
  }

  private async assignToDepartment(input: OnboardingInput, actor: AuthUser): Promise<void> {
    await prisma.employee.update({
      where: { id: input.employeeId },
      data: { departmentId: input.departmentId, managerId: input.managerId },
    });
    this.completedSteps.push('assignToDepartment');
  }

  private async createUserAccount(input: OnboardingInput, actor: AuthUser): Promise<string> {
    const employee = await prisma.employee.findFirstOrThrow({
      where: { id: input.employeeId, organizationId: actor.organizationId },
    });
    const user = await prisma.user.create({
      data: {
        email: employee.email,
        name: employee.name,
        passwordHash: 'TEMP_RESET_REQUIRED',
        role: 'EMPLOYEE',
        organizationId: actor.organizationId,
        employeeId: input.employeeId,
      },
    });
    this.completedSteps.push('createUserAccount');
    return user.id;
  }

  private async initializeLeaveBalance(employeeId: string, actor: AuthUser): Promise<void> {
    await prisma.leaveBalance.create({
      data: {
        employeeId,
        organizationId: actor.organizationId,
        casualLeave: 12,
        sickLeave: 12,
        earnedLeave: 0,
      },
    });
    this.completedSteps.push('initializeLeaveBalance');
  }

  private async sendWelcomeEmail(employeeId: string, userId: string): Promise<void> {
    await emailQueue.add('welcome-employee', { employeeId, userId });
    this.completedSteps.push('sendWelcomeEmail');
  }

  private async notifyManager(managerId: string, employeeId: string, organizationId: string): Promise<void> {
    await notificationQueue.add('new-team-member', { managerId, employeeId, organizationId });
    this.completedSteps.push('notifyManager');
  }

  private async compensate(input: OnboardingInput, actor: AuthUser): Promise<void> {
    // Reverse completed steps
    for (const step of [...this.completedSteps].reverse()) {
      try {
        switch (step) {
          case 'createUserAccount':
            await prisma.user.deleteMany({ where: { employeeId: input.employeeId, organizationId: actor.organizationId } });
            break;
          case 'initializeLeaveBalance':
            await prisma.leaveBalance.deleteMany({ where: { employeeId: input.employeeId, organizationId: actor.organizationId } });
            break;
          // Email/notifications don't need compensation
        }
      } catch {
        // Log compensation failures but continue — partial compensation is better than none
        console.error(`Compensation failed for step: ${step}`);
      }
    }
  }
}
```

---

## Outbox pattern (reliable event publishing)

Guarantees events are published even if the process crashes after the DB write.

```typescript
// prisma/schema.prisma — add OutboxEvent model
// model OutboxEvent {
//   id            String    @id @default(uuid())
//   organizationId String
//   aggregateId   String
//   aggregateType String
//   eventType     String
//   payload       Json
//   processedAt   DateTime?
//   createdAt     DateTime  @default(now())
//   @@index([processedAt, createdAt])
//   @@index([organizationId])
// }

// backend/src/lib/outbox.ts
import { prisma } from './prisma.js';

export const outbox = {
  async store(
    tx: typeof prisma,
    event: { organizationId: string; aggregateId: string; aggregateType: string; eventType: string; payload: object },
  ) {
    await tx.outboxEvent.create({ data: event });
  },
};

// Write + outbox in same transaction = atomic
await prisma.$transaction(async (tx) => {
  const leaveRequest = await tx.leaveRequest.update({
    where: { id, organizationId: actor.organizationId },
    data: { status: 'APPROVED' },
  });
  await outbox.store(tx, {
    organizationId: actor.organizationId,
    aggregateId: id,
    aggregateType: 'LeaveRequest',
    eventType: 'LEAVE_REQUEST_APPROVED',
    payload: { approverId: actor.id },
  });
  return leaveRequest;
});
```

```typescript
// backend/src/jobs/workers/outbox.worker.ts — polls and dispatches events
import { Worker } from 'bullmq';
import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { io } from '../../socket.js';

// BullMQ job polls outbox every 5 seconds
export const outboxWorker = new Worker(
  'outbox',
  async () => {
    const unprocessed = await prisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const event of unprocessed) {
      try {
        // Dispatch to socket
        io.to(`org:${event.organizationId}`).emit(`event:${event.eventType}`, event.payload);

        // Mark processed
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
      } catch (err) {
        // Don't mark processed — will retry next poll
      }
    }
  },
  { connection: redis, concurrency: 1 },
);
```

---

## Process Manager pattern

For long-running workflows that wait on external events (approvals, payments, integrations).

```typescript
// backend/src/modules/expense/domain/expense-approval.process-manager.ts
import { prisma } from '../../../lib/prisma.js';

type ProcessState = 'AWAITING_MANAGER' | 'AWAITING_FINANCE' | 'AWAITING_CFO' | 'APPROVED' | 'REJECTED';

export class ExpenseApprovalProcessManager {
  static async handleEvent(event: { type: string; expenseId: string; organizationId: string; actorId: string }) {
    const expense = await prisma.expense.findFirstOrThrow({
      where: { id: event.expenseId, organizationId: event.organizationId },
    });

    const transitions: Record<string, Record<string, ProcessState>> = {
      AWAITING_MANAGER: { MANAGER_APPROVED: 'AWAITING_FINANCE', REJECTED: 'REJECTED' },
      AWAITING_FINANCE: { FINANCE_APPROVED: 'AWAITING_CFO', REJECTED: 'REJECTED' },
      AWAITING_CFO:     { CFO_APPROVED: 'APPROVED', REJECTED: 'REJECTED' },
    };

    const nextState = transitions[expense.approvalState]?.[event.type];
    if (!nextState) return; // Unknown transition — ignore

    await prisma.expense.update({
      where: { id: event.expenseId },
      data: { approvalState: nextState },
    });

    // Trigger side effects based on new state
    if (nextState === 'APPROVED') {
      await prisma.payment.create({
        data: { expenseId: event.expenseId, amount: expense.amount, organizationId: event.organizationId, status: 'PENDING' },
      });
    }
  }
}
```

---

## Choreography (event-driven, no central orchestrator)

Use when modules should react independently without knowing about each other.

```typescript
// Module A publishes an event
// backend/src/modules/leave/leave.service.ts — after approval:
io.to(`org:${organizationId}`).emit('domain:LeaveApproved', {
  employeeId,
  startDate,
  endDate,
  durationDays,
});

// Module B (Attendance) reacts independently
// backend/src/modules/attendance/attendance.event-listener.ts
import { io } from '../../socket.js';
io.on('domain:LeaveApproved', async (data) => {
  await prisma.attendanceException.createMany({
    data: buildLeaveDates(data.startDate, data.endDate).map((date) => ({
      employeeId: data.employeeId,
      date,
      type: 'APPROVED_LEAVE',
    })),
  });
});
```

---

## Idempotency key pattern

Prevents duplicate processing when retries or double-submits occur.

```typescript
// backend/src/middleware/idempotency.ts
import { redis } from '../lib/redis.js';
import type { Request, Response, NextFunction } from 'express';

export function idempotencyMiddleware(ttlSeconds = 86400) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    if (!key) return next();

    const cacheKey = `idem:${req.user?.organizationId}:${key}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      redis.setex(cacheKey, ttlSeconds, JSON.stringify(body)).catch(() => {});
      return originalJson(body);
    };

    next();
  };
}

// Apply to mutation routes:
// router.post('/payments', authenticate, requirePermission('PAYMENT_CREATE'), idempotencyMiddleware(), PaymentController.create);
// Frontend sends: headers: { 'Idempotency-Key': crypto.randomUUID() }
```

---

## Durable execution checklist

| Concern | Pattern |
|---------|---------|
| Event lost if process crashes | Outbox pattern |
| Double-processing a message | Idempotency key |
| Partial saga failure | Compensation steps in reverse order |
| Long-running approval workflows | Process Manager |
| Module coupling | Choreography (events) over Orchestration (direct calls) |
| Concurrent state transitions | Prisma updateMany with current state in WHERE |
