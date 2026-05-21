# Skill: Business Rules Patterns

## Specification pattern

A Specification is a single-purpose, combinable predicate that encodes one business rule.
Name every spec after the rule it checks.

```typescript
// shared/src/domain/specification.ts
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) { super(); }
  isSatisfiedBy(candidate: T) { return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate); }
}
class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: Specification<T>, private right: Specification<T>) { super(); }
  isSatisfiedBy(candidate: T) { return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate); }
}
class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private wrapped: Specification<T>) { super(); }
  isSatisfiedBy(candidate: T) { return !this.wrapped.isSatisfiedBy(candidate); }
}
```

```typescript
// backend/src/modules/leave/domain/leave-specifications.ts
import { CompositeSpecification } from '@boilerplate/shared/domain/specification.js';

interface LeaveCandidate {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  leaveBalance: number;
  durationDays: number;
  existingApprovedLeaves: Array<{ startDate: Date; endDate: Date }>;
  probationEndDate: Date | null;
}

export class HasSufficientLeaveBalanceSpec extends CompositeSpecification<LeaveCandidate> {
  isSatisfiedBy(candidate: LeaveCandidate): boolean {
    return candidate.leaveBalance >= candidate.durationDays;
  }
}

export class IsNotOnProbationSpec extends CompositeSpecification<LeaveCandidate> {
  isSatisfiedBy(candidate: LeaveCandidate): boolean {
    if (!candidate.probationEndDate) return true;
    return new Date() > candidate.probationEndDate;
  }
}

export class HasNoOverlappingLeaveSpec extends CompositeSpecification<LeaveCandidate> {
  isSatisfiedBy(candidate: LeaveCandidate): boolean {
    return !candidate.existingApprovedLeaves.some(
      (leave) => candidate.startDate < leave.endDate && candidate.endDate > leave.startDate,
    );
  }
}

export class IsWeekdayRangeSpec extends CompositeSpecification<LeaveCandidate> {
  isSatisfiedBy(candidate: LeaveCandidate): boolean {
    const day = candidate.startDate.getDay();
    return day !== 0 && day !== 6; // Not Sunday or Saturday
  }
}

// Compose rules
export const canRequestLeaveSpec = new HasSufficientLeaveBalanceSpec()
  .and(new IsNotOnProbationSpec())
  .and(new HasNoOverlappingLeaveSpec())
  .and(new IsWeekdayRangeSpec());
```

```typescript
// Usage in service
import { canRequestLeaveSpec } from './domain/leave-specifications.js';
import { ConflictError } from '../../middleware/errorHandler.js';

const candidate = await buildLeaveCandidate(dto, actor);
if (!canRequestLeaveSpec.isSatisfiedBy(candidate)) {
  // Optionally identify WHICH spec failed for better error messages
  const insufficientBalance = new HasSufficientLeaveBalanceSpec();
  const overlapping = new HasNoOverlappingLeaveSpec();
  if (!insufficientBalance.isSatisfiedBy(candidate)) {
    throw new ConflictError('Insufficient leave balance');
  }
  if (!overlapping.isSatisfiedBy(candidate)) {
    throw new ConflictError('Leave dates overlap with an existing approved leave');
  }
  throw new ConflictError('Leave request does not meet policy requirements');
}
```

---

## Policy object pattern

When a decision involves multiple rules and returns a result (not just true/false), use a Policy object.

```typescript
// backend/src/modules/payroll/domain/overtime-policy.ts

interface OvertimeInput {
  hoursWorked: number;
  role: 'EMPLOYEE' | 'MANAGER' | 'CONTRACTOR';
  monthlySalary: number;
  isHoliday: boolean;
}

interface OvertimeDecision {
  eligible: boolean;
  multiplier: number;
  reason: string;
}

export class OvertimePolicy {
  static evaluate(input: OvertimeInput): OvertimeDecision {
    if (input.role === 'CONTRACTOR') {
      return { eligible: false, multiplier: 0, reason: 'Contractors are not eligible for overtime' };
    }
    if (input.hoursWorked <= 8) {
      return { eligible: false, multiplier: 0, reason: 'No overtime — standard hours not exceeded' };
    }
    const multiplier = input.isHoliday ? 2.0 : input.role === 'MANAGER' ? 1.25 : 1.5;
    return {
      eligible: true,
      multiplier,
      reason: `${input.isHoliday ? 'Holiday' : 'Weekday'} overtime at ${multiplier}x`,
    };
  }
}
```

---

## Rule table pattern

For complex multi-condition decisions, encode rules in a table rather than nested if/else.

```typescript
// backend/src/modules/expense/domain/approval-rules.ts

interface ExpenseApprovalContext {
  amount: number;
  category: 'TRAVEL' | 'EQUIPMENT' | 'MEALS' | 'OTHER';
  employeeLevel: 'JUNIOR' | 'SENIOR' | 'LEAD' | 'MANAGER';
}

interface ApprovalRequirement {
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  requiresCFOApproval: boolean;
}

// Rule table: avoids nested conditionals
const APPROVAL_RULES: Array<{
  condition: (ctx: ExpenseApprovalContext) => boolean;
  result: ApprovalRequirement;
}> = [
  {
    condition: (ctx) => ctx.amount <= 1000,
    result: { requiresManagerApproval: false, requiresFinanceApproval: false, requiresCFOApproval: false },
  },
  {
    condition: (ctx) => ctx.amount <= 10000 && ctx.category !== 'EQUIPMENT',
    result: { requiresManagerApproval: true, requiresFinanceApproval: false, requiresCFOApproval: false },
  },
  {
    condition: (ctx) => ctx.amount <= 50000,
    result: { requiresManagerApproval: true, requiresFinanceApproval: true, requiresCFOApproval: false },
  },
  {
    condition: () => true, // default
    result: { requiresManagerApproval: true, requiresFinanceApproval: true, requiresCFOApproval: true },
  },
];

export function getApprovalRequirements(ctx: ExpenseApprovalContext): ApprovalRequirement {
  const rule = APPROVAL_RULES.find((r) => r.condition(ctx));
  return rule!.result; // default always matches
}
```

---

## Domain service pattern

When a business rule spans multiple aggregates, put it in a Domain Service — not in either aggregate.

```typescript
// backend/src/modules/leave/domain/leave-balance.domain-service.ts
import { prisma } from '../../../lib/prisma.js';

export class LeaveBalanceDomainService {
  // Spans Employee and LeaveBalance aggregates — belongs in a domain service
  static async deductLeaveBalance(
    employeeId: string,
    organizationId: string,
    days: number,
    tx: typeof prisma,
  ): Promise<void> {
    const updated = await tx.leaveBalance.updateMany({
      where: {
        employeeId,
        organizationId,
        balance: { gte: days }, // Optimistic lock: only deduct if sufficient
      },
      data: { balance: { decrement: days } },
    });
    if (updated.count === 0) {
      throw new ConflictError('Insufficient leave balance or concurrent update conflict');
    }
  }
}
```

---

## Rule composition for validation schemas

Compose rules with Zod for API-boundary validation (different from domain specs — these are input validation).

```typescript
// shared/src/schemas/leave.schema.ts
import { z } from 'zod';

export const CreateLeaveRequestSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY']),
  reason: z.string().min(10).max(500),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Start date must be before end date', path: ['endDate'] },
).refine(
  (data) => new Date(data.startDate) >= new Date(),
  { message: 'Cannot apply for leave in the past', path: ['startDate'] },
);
```

---

## When to use each pattern

| Pattern | Use when |
|---------|----------|
| Specification | Single combinable predicate — is this candidate valid? |
| Policy | Multi-input → structured result (not just boolean) |
| Rule table | Many conditions → one of N outcomes, avoids deep if/else |
| Domain Service | Business rule spans 2+ aggregates |
| Zod refinement | Input validation at API boundary (before reaching domain) |
