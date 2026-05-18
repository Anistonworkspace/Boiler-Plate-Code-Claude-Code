# Skill — MVC Code Patterns

Read this when writing or reviewing any backend module. These are the exact patterns every service/controller/route must follow.

---

## Controller pattern (always thin)

```typescript
// ✅ CORRECT — controller is a pass-through
static async create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await MyService.create(req.body, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ❌ WRONG — controller has business logic
static async create(req: Request, res: Response, next: NextFunction) {
  const exists = await prisma.thing.findFirst({ where: { name: req.body.name } });
  if (exists) return res.status(409).json({ success: false, error: { code: 'CONFLICT' } });
  // ^ This belongs in the service
}
```

## Service guard pattern (always check before write)

```typescript
// ✅ CORRECT — guard then write in transaction
static async create(dto: CreateInput, actor: AuthUser) {
  const existing = await prisma.thing.findFirst({
    where: { name: dto.name, organizationId: actor.organizationId, deletedAt: null },
  });
  if (existing) throw new ConflictError('Already exists');

  return prisma.$transaction(async (tx) => {
    const record = await tx.thing.create({ data: { ...dto, organizationId: actor.organizationId } });
    await auditLogger.log(tx, { action: 'THING_CREATED', entity: 'Thing', entityId: record.id, actorId: actor.id, organizationId: actor.organizationId });
    return record;
  });
}
```

## List with pagination (mandatory pattern)

```typescript
static async list(query: ListQuery, actor: AuthUser) {
  const { page = 1, limit = 20 } = query;
  const where = { organizationId: actor.organizationId, deletedAt: null };
  const [data, total] = await prisma.$transaction([
    prisma.thing.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.thing.count({ where }),
  ]);
  return { data, meta: { page, limit, total } };
}
```

## Soft delete (never hard delete)

```typescript
// ✅ CORRECT
await tx.thing.update({ where: { id }, data: { deletedAt: new Date() } });

// ❌ WRONG
await prisma.thing.delete({ where: { id } });
```

## AppError subclasses (throw these, not raw Error)

```typescript
throw new NotFoundError('Thing not found');         // 404
throw new ConflictError('Already exists');           // 409
throw new ForbiddenError('Not authorized');          // 403
throw new ValidationError('Invalid input');          // 400
throw new AppError('Something went wrong', 500);    // custom
```

## Middleware chain (EXACT order, no deviation)

```typescript
router.post(
  '/',
  authenticate,                              // 1. verify JWT → set req.user
  requirePermission('THING_CREATE'),         // 2. RBAC check
  validateRequest({ body: CreateSchema }),   // 3. Zod parse → req.body typed
  ThingController.create,                    // 4. thin controller
);
```
