---
# MVC Architecture — Mandatory for Every Feature

This project enforces a strict 4-layer architecture. Every backend feature MUST follow this exact structure. No exceptions.

---

## The 4 layers

### Layer 1 — Model (Prisma schema)
**Location:** `prisma/schema.prisma`
- Single source of truth for ALL data shapes
- TypeScript types generated automatically — never write manual DB types
- Enums mirrored in `shared/src/enums.ts` — always keep in sync
- Sensitive fields suffixed `Encrypted`

### Layer 2 — View (React components)
**Location:** `frontend/src/features/<name>/`
- Renders data — zero business logic allowed
- All data comes from RTK Query hooks — never raw fetch()
- Validation schemas come from `shared/src/schemas/` via `zodResolver()`
- Conditional renders based on data are fine; calculations are not

### Layer 3 — Controller (Express controllers)
**Location:** `backend/src/modules/<name>/<name>.controller.ts`
- Thin layer: parse request → call ONE service method → return response
- NEVER contains Prisma queries, business conditions, auditLogger calls, or socket emits
- ALWAYS wraps in try/catch and passes errors to `next(err)`
- Returns the standard API envelope: `{ success: true, data: ... }`

### Layer 4 — Service (Business logic)
**Location:** `backend/src/modules/<name>/<name>.service.ts`
- ALL business rules, validations, conditions live here
- ALL Prisma queries — every one includes `organizationId: actor.organizationId`
- ALL `prisma.$transaction()` blocks for multi-table writes
- ALL `auditLogger.log()` calls on create/update/delete
- ALL BullMQ queue pushes
- ALL Socket.io emits
- Throws `AppError` subclasses — never raw `Error` or HTTP status codes

---

## Required file structure per backend module

```
backend/src/modules/<name>/
  <name>.controller.ts    ← THIN: parse → call service → respond
  <name>.service.ts       ← THICK: all logic, all DB, all side effects
  <name>.routes.ts        ← middleware chain + route registration
  <name>.validation.ts    ← Zod request schemas
  __tests__/
    <name>.service.test.ts  ← unit tests target service, not controller
```

---

## Middleware chain order (NEVER change this)

```
authenticate → requirePermission → validateRequest → controller
```

---

## Controller template

```typescript
// <name>.controller.ts — THIN: parse → service → respond
import type { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service.js';
import type { CreateEmployeeInput } from './employee.validation.js';

export class EmployeeController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.create(
        req.body as CreateEmployeeInput,
        req.user,
      );
      res.status(201).json({ success: true, data: employee });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmployeeService.list(req.query, req.user);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.getOne(req.params.id, req.user);
      res.json({ success: true, data: employee });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.update(req.params.id, req.body, req.user);
      res.json({ success: true, data: employee });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await EmployeeService.remove(req.params.id, req.user);
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
}
```

---

## Service template

```typescript
// <name>.service.ts — THICK: all logic, all DB, all side effects
import { prisma } from '../../lib/prisma.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { emailQueue } from '../../jobs/queues.js';
import { ConflictError, NotFoundError } from '../../middleware/errorHandler.js';
import type { AuthUser } from '@boilerplate/shared';
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeeQuery } from './employee.validation.js';

export class EmployeeService {
  static async create(dto: CreateEmployeeInput, actor: AuthUser) {
    // 1. Guard: check uniqueness
    const existing = await prisma.employee.findFirst({
      where: { email: dto.email, organizationId: actor.organizationId, deletedAt: null },
    });
    if (existing) throw new ConflictError('An employee with this email already exists');

    // 2. Write in a transaction
    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: { ...dto, organizationId: actor.organizationId },
      });
      await auditLogger.log(tx, {
        action: 'EMPLOYEE_CREATED',
        entity: 'Employee',
        entityId: emp.id,
        actorId: actor.id,
        organizationId: actor.organizationId,
        after: emp,
      });
      return emp;
    });

    // 3. Side effects outside the transaction
    await emailQueue.add('welcome-employee', { employeeId: employee.id });

    return employee;
  }

  static async list(query: ListEmployeeQuery, actor: AuthUser) {
    const { page = 1, limit = 20 } = query;
    const where = { organizationId: actor.organizationId, deletedAt: null };

    const [data, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  static async getOne(id: string, actor: AuthUser) {
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }

  static async update(id: string, dto: UpdateEmployeeInput, actor: AuthUser) {
    const employee = await this.getOne(id, actor); // re-uses guard above

    return prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: dto,
      });
      await auditLogger.log(tx, {
        action: 'EMPLOYEE_UPDATED',
        entity: 'Employee',
        entityId: id,
        actorId: actor.id,
        organizationId: actor.organizationId,
        before: employee,
        after: updated,
      });
      return updated;
    });
  }

  static async remove(id: string, actor: AuthUser) {
    await this.getOne(id, actor);

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await auditLogger.log(tx, {
        action: 'EMPLOYEE_DELETED',
        entity: 'Employee',
        entityId: id,
        actorId: actor.id,
        organizationId: actor.organizationId,
      });
    });
  }
}
```

---

## Validation template

```typescript
// <name>.validation.ts — Zod schemas imported from shared OR defined here
import { z } from 'zod';
import { PaginationSchema } from '@boilerplate/shared';

export const CreateEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  departmentId: z.string().uuid(),
  designationId: z.string().uuid(),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export const ListEmployeeQuerySchema = PaginationSchema.extend({
  departmentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type ListEmployeeQuery = z.infer<typeof ListEmployeeQuerySchema>;
```

---

## Routes template

```typescript
// <name>.routes.ts — wire middleware chain
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { EmployeeController } from './employee.controller.js';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  ListEmployeeQuerySchema,
} from './employee.validation.js';

export const employeeRouter = Router();

employeeRouter.get(
  '/',
  authenticate,
  requirePermission('EMPLOYEE_VIEW'),
  validateRequest({ query: ListEmployeeQuerySchema }),
  EmployeeController.list,
);

employeeRouter.post(
  '/',
  authenticate,
  requirePermission('EMPLOYEE_CREATE'),
  validateRequest({ body: CreateEmployeeSchema }),
  EmployeeController.create,
);

employeeRouter.get(
  '/:id',
  authenticate,
  requirePermission('EMPLOYEE_VIEW'),
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  EmployeeController.getOne,
);

employeeRouter.patch(
  '/:id',
  authenticate,
  requirePermission('EMPLOYEE_UPDATE'),
  validateRequest({ params: z.object({ id: z.string().uuid() }), body: UpdateEmployeeSchema }),
  EmployeeController.update,
);

employeeRouter.delete(
  '/:id',
  authenticate,
  requirePermission('EMPLOYEE_DELETE'),
  validateRequest({ params: z.object({ id: z.string().uuid() }) }),
  EmployeeController.remove,
);
```

---

## What NEVER belongs in a controller
- Prisma queries of any kind
- Business condition checks (if duplicate exists, if status allows)
- `auditLogger` calls
- BullMQ queue pushes
- Socket.io emits
- Nested try/catch blocks

## What NEVER belongs in a service
- `req`, `res`, `next` — ever
- `res.json()` or `res.status()`
- HTTP status codes set directly (throw `AppError`, not HTTP)
