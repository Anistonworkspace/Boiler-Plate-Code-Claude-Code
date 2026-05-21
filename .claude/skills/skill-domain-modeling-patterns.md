# Skill: Domain Modeling Patterns (DDD)

## Aggregate pattern

An aggregate is a cluster of objects treated as a single unit for data changes.
The **aggregate root** is the only object external code can reference directly.

```typescript
// shared/src/domain/aggregate.ts
export abstract class AggregateRoot<T> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}

export interface DomainEvent {
  occurredAt: Date;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}
```

```typescript
// backend/src/modules/leave/domain/leave-request.aggregate.ts
import { AggregateRoot, DomainEvent } from '@boilerplate/shared/domain/aggregate.js';
import { LeaveStatus } from '@boilerplate/shared/enums.js';
import { ConflictError, ForbiddenError } from '../../../middleware/errorHandler.js';

interface LeaveRequestState {
  id: string;
  employeeId: string;
  managerId: string;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  organizationId: string;
}

export class LeaveRequestAggregate extends AggregateRoot<LeaveRequestState> {
  private constructor(private readonly state: LeaveRequestState) {
    super();
  }

  static create(state: LeaveRequestState): LeaveRequestAggregate {
    const agg = new LeaveRequestAggregate(state);
    agg.addDomainEvent({
      occurredAt: new Date(),
      aggregateId: state.id,
      eventType: 'LEAVE_REQUEST_CREATED',
      payload: { employeeId: state.employeeId, startDate: state.startDate, endDate: state.endDate },
    });
    return agg;
  }

  static reconstitute(state: LeaveRequestState): LeaveRequestAggregate {
    return new LeaveRequestAggregate(state);
  }

  approve(approverId: string): void {
    // Self-approval guard — CRITICAL
    if (approverId === this.state.employeeId) {
      throw new ForbiddenError('You cannot approve your own leave request');
    }
    if (this.state.status !== LeaveStatus.PENDING) {
      throw new ConflictError(`Cannot approve a request in ${this.state.status} state`);
    }
    this.state.status = LeaveStatus.APPROVED;
    this.addDomainEvent({
      occurredAt: new Date(),
      aggregateId: this.state.id,
      eventType: 'LEAVE_REQUEST_APPROVED',
      payload: { approverId },
    });
  }

  reject(approverId: string, reason: string): void {
    if (approverId === this.state.employeeId) {
      throw new ForbiddenError('You cannot reject your own leave request');
    }
    if (this.state.status !== LeaveStatus.PENDING) {
      throw new ConflictError(`Cannot reject a request in ${this.state.status} state`);
    }
    this.state.status = LeaveStatus.REJECTED;
    this.addDomainEvent({
      occurredAt: new Date(),
      aggregateId: this.state.id,
      eventType: 'LEAVE_REQUEST_REJECTED',
      payload: { approverId, reason },
    });
  }

  cancel(requesterId: string): void {
    if (requesterId !== this.state.employeeId) {
      throw new ForbiddenError('Only the requester can cancel their leave request');
    }
    if (![LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(this.state.status)) {
      throw new ConflictError('This request cannot be cancelled');
    }
    this.state.status = LeaveStatus.CANCELLED;
    this.addDomainEvent({
      occurredAt: new Date(),
      aggregateId: this.state.id,
      eventType: 'LEAVE_REQUEST_CANCELLED',
      payload: { requesterId },
    });
  }

  get id() { return this.state.id; }
  get status() { return this.state.status; }
  get toState() { return { ...this.state }; }
}
```

---

## Value Object pattern

Value objects have no identity — two with the same values are equal. Use them to avoid primitive obsession.

```typescript
// shared/src/domain/value-objects.ts

export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'INR',
  ) {
    if (amount < 0) throw new Error('Money amount cannot be negative');
  }

  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  format(): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: this.currency }).format(this.amount);
  }
}

export class EmailAddress {
  constructor(public readonly value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`Invalid email address: ${value}`);
    }
  }

  get domain(): string {
    return this.value.split('@')[1];
  }

  equals(other: EmailAddress): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}

export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    if (start >= end) throw new Error('Start date must be before end date');
  }

  get durationDays(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24));
  }

  overlaps(other: DateRange): boolean {
    return this.start < other.end && this.end > other.start;
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }
}
```

---

## Bounded Context mapping

```typescript
// Anti-corruption layer between HR module and Payroll module
// backend/src/modules/payroll/infrastructure/hr-acl.ts

import { prisma } from '../../../lib/prisma.js';

// Payroll uses its own Employee concept — maps from HR Employee
export interface PayrollEmployee {
  id: string;
  monthlySalary: number;
  bankAccountEncrypted: string;
  taxBracket: 'BASIC' | 'STANDARD' | 'HIGH';
}

export class HrAntiCorruptionLayer {
  static async getPayrollEmployee(employeeId: string, organizationId: string): Promise<PayrollEmployee> {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId, deletedAt: null },
      include: { designation: true },
    });
    if (!emp) throw new Error(`Employee ${employeeId} not found`);

    // Translate HR domain concept → Payroll domain concept
    return {
      id: emp.id,
      monthlySalary: emp.monthlySalaryEncrypted ? decryptSalary(emp.monthlySalaryEncrypted) : 0,
      bankAccountEncrypted: emp.bankAccountNumberEncrypted ?? '',
      taxBracket: emp.monthlySalary > 100000 ? 'HIGH' : emp.monthlySalary > 50000 ? 'STANDARD' : 'BASIC',
    };
  }
}

function decryptSalary(encrypted: string): number {
  // Use encryption utility from skill-encryption-patterns.md
  return 0; // placeholder
}
```

---

## Domain Event dispatcher

```typescript
// backend/src/lib/domain-event-dispatcher.ts
import { DomainEvent } from '@boilerplate/shared/domain/aggregate.js';
import { io } from '../socket.js';
import { auditLogger } from '../utils/auditLogger.js';
import { prisma } from './prisma.js';

type EventHandler = (event: DomainEvent, organizationId: string) => Promise<void>;

const handlers: Map<string, EventHandler[]> = new Map();

export const DomainEventDispatcher = {
  register(eventType: string, handler: EventHandler) {
    if (!handlers.has(eventType)) handlers.set(eventType, []);
    handlers.get(eventType)!.push(handler);
  },

  async dispatch(events: DomainEvent[], organizationId: string) {
    for (const event of events) {
      const eventHandlers = handlers.get(event.eventType) ?? [];
      await Promise.all(eventHandlers.map(h => h(event, organizationId)));
    }
  },
};

// Register handlers once at startup
// backend/src/modules/leave/leave.event-handlers.ts
DomainEventDispatcher.register('LEAVE_REQUEST_APPROVED', async (event, organizationId) => {
  // 1. Send notification
  await prisma.notification.create({
    data: {
      userId: event.payload.employeeId as string,
      organizationId,
      type: 'LEAVE_APPROVED',
      message: 'Your leave request has been approved',
      entityId: event.aggregateId,
    },
  });
  // 2. Emit socket event
  io.to(`org:${organizationId}`).emit('notification:new', { userId: event.payload.employeeId });
});
```

---

## Repository pattern (wraps Prisma)

```typescript
// backend/src/modules/leave/infrastructure/leave-request.repository.ts
import { prisma } from '../../../lib/prisma.js';
import { LeaveRequestAggregate } from '../domain/leave-request.aggregate.js';

export class LeaveRequestRepository {
  async findById(id: string, organizationId: string): Promise<LeaveRequestAggregate | null> {
    const record = await prisma.leaveRequest.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!record) return null;
    return LeaveRequestAggregate.reconstitute(record);
  }

  async save(agg: LeaveRequestAggregate, tx = prisma): Promise<void> {
    const state = agg.toState;
    await tx.leaveRequest.upsert({
      where: { id: state.id },
      create: state,
      update: state,
    });
  }
}
```

---

## When to use DDD patterns

| Use | When |
|-----|------|
| Aggregate | Multiple objects must change together atomically |
| Value Object | Two instances with same data should be considered equal |
| Domain Event | Something happened that other parts of the system need to react to |
| Repository | You want to decouple persistence from domain logic |
| Anti-Corruption Layer | Two modules have different concepts of the "same" entity |
| Bounded Context | Module has its own ubiquitous language and should not share models |
