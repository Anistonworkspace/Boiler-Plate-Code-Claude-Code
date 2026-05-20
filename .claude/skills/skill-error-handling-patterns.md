# Skill — Error Handling Patterns

Enterprise-level error handling: typed errors in services, safe API responses, frontend error decoding.

---

## Backend — AppError class hierarchy (already in boilerplate)

```typescript
// backend/src/middleware/errorHandler.ts — already exists, do NOT recreate
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
  ) { super(message); this.name = 'AppError'; }
}

export class NotFoundError     extends AppError { constructor(msg = 'Not found')              { super(msg, 404, 'NOT_FOUND'); } }
export class ConflictError     extends AppError { constructor(msg = 'Already exists')          { super(msg, 409, 'CONFLICT'); } }
export class ValidationError   extends AppError { constructor(msg = 'Validation failed')       { super(msg, 400, 'VALIDATION_ERROR'); } }
export class UnauthorizedError extends AppError { constructor(msg = 'Not authenticated')       { super(msg, 401, 'UNAUTHORIZED'); } }
export class ForbiddenError    extends AppError { constructor(msg = 'Access denied')           { super(msg, 403, 'FORBIDDEN'); } }
export class RateLimitError    extends AppError { constructor(msg = 'Too many requests')       { super(msg, 429, 'RATE_LIMITED'); } }
export class ServerError       extends AppError { constructor(msg = 'Internal server error')   { super(msg, 500, 'SERVER_ERROR'); } }
export class GoneError         extends AppError { constructor(msg = 'Resource no longer avail') { super(msg, 410, 'GONE'); } }
export class UnprocessableError extends AppError { constructor(msg = 'Unprocessable entity')  { super(msg, 422, 'UNPROCESSABLE'); } }
```

---

## Which error to throw — decision table

| Situation | Throw |
|-----------|-------|
| Record not found (by ID) | `NotFoundError('Employee not found')` |
| Record soft-deleted (deletedAt != null) | `NotFoundError('Employee not found')` |
| Unique constraint violation (email duplicate) | `ConflictError('Email already registered')` |
| Wrong org (IDOR attempt) | `NotFoundError` — never reveal it exists |
| User not authenticated (no/invalid token) | `UnauthorizedError` |
| User authenticated but missing permission | `ForbiddenError('You cannot approve your own request')` |
| Self-approval attempt | `ForbiddenError('Self-approval is not allowed')` |
| Status transition not allowed | `UnprocessableError('Cannot approve a rejected request')` |
| Race condition (optimistic lock miss) | `ConflictError('Request was already processed')` |
| Invalid file type / size | `ValidationError('Only PDF and JPEG allowed, max 5MB')` |
| External API failed | `ServerError` (log internally, safe message externally) |

---

## Handling Prisma errors — map to AppError

```typescript
// backend/src/utils/handlePrismaError.ts
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ServerError } from '../middleware/errorHandler.js';

export function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(', ') ?? 'field';
        throw new ConflictError(`A record with this ${field} already exists`);
      }
      case 'P2025':
        // Record not found (e.g. update/delete on non-existent ID)
        throw new NotFoundError('Record not found');
      case 'P2003':
        // Foreign key constraint failure
        throw new ConflictError('Related record does not exist');
      case 'P2014':
        // Required relation violation
        throw new ConflictError('Cannot delete — other records depend on this');
      default:
        throw new ServerError('Database operation failed');
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    throw new ServerError('Invalid database query');
  }
  throw err;  // re-throw AppError or unknown
}
```

```typescript
// Usage in any service method
try {
  const record = await prisma.employee.create({ data });
} catch (err) {
  handlePrismaError(err);   // converts Prisma errors → AppError
}
```

---

## Global error handler middleware (already in boilerplate)

```typescript
// backend/src/middleware/errorHandler.ts — the catch-all
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Zod validation errors from validateRequest middleware
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields: err.flatten().fieldErrors,   // maps field name → error array
      },
    });
  }

  // Unknown — log internally, never expose
  logger.error('[Unhandled error]', { error: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred' },
  });
}
```

---

## Frontend — Decode error codes to user messages

```typescript
// frontend/src/lib/errorMessages.ts
const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND:        'The requested record was not found.',
  CONFLICT:         'This record already exists.',
  VALIDATION_ERROR: 'Please check the form fields and try again.',
  UNAUTHORIZED:     'Your session has expired. Please log in again.',
  FORBIDDEN:        'You do not have permission to perform this action.',
  RATE_LIMITED:     'Too many requests. Please wait a moment.',
  SERVER_ERROR:     'Something went wrong on our end. Please try again.',
  UNPROCESSABLE:    'This action cannot be completed in the current state.',
  GONE:             'This record has been deleted.',
};

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { error?: { code?: string; message?: string } } }).data;
    const code = data?.error?.code;
    if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if (data?.error?.message) return data.error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
```

---

## Frontend — Mutation error handler with toast + field errors

```typescript
// Standard mutation error handling in a component
import { getErrorMessage } from '@/lib/errorMessages';
import { toast } from '@/hooks/useToast';

const [createEmployee, { isLoading }] = useCreateEmployeeMutation();

const onSubmit = async (data: CreateEmployeeInput) => {
  try {
    await createEmployee(data).unwrap();
    toast.success('Employee created successfully');
    onClose();
  } catch (err: unknown) {
    const message = getErrorMessage(err);

    // Check for field-level validation errors
    if (err && typeof err === 'object' && 'data' in err) {
      const fields = (err as any).data?.error?.fields;
      if (fields) {
        Object.entries(fields).forEach(([field, errors]) => {
          form.setError(field as keyof CreateEmployeeInput, {
            message: (errors as string[])[0],
          });
        });
        return;
      }
    }

    toast.error(message);
  }
};
```

---

## RTK Query — Global 401 handler (already in boilerplate)

```typescript
// frontend/src/lib/api.ts — baseQuery with auto-refresh on 401
const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Try silent token refresh
    const refreshResult = await baseQuery('/auth/refresh', api, extraOptions);
    if (refreshResult.data) {
      // Retry original request with new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed — log the user out
      api.dispatch(logout());
    }
  }

  return result;
};
```

---

## Error boundary for React (catches render errors)

```typescript
// frontend/src/components/ErrorBoundary.tsx — already in boilerplate
// Usage: wrap routes or feature pages
<ErrorBoundary fallback={<div>Something went wrong. <button onClick={() => window.location.reload()}>Reload</button></div>}>
  <LeaveRequestPage />
</ErrorBoundary>
```

---

## Checklist

- [ ] Every service method throws an `AppError` subclass — never raw `Error`
- [ ] Prisma calls in services are wrapped with `handlePrismaError`
- [ ] Controllers never contain error logic — only `try { } catch (err) { next(err); }`
- [ ] Frontend uses `getErrorMessage()` for all mutation errors
- [ ] Field-level Zod errors are mapped to `form.setError()`, not just a toast
- [ ] 401 auto-refresh is wired in RTK Query base query
- [ ] No raw Prisma errors or stack traces ever reach API consumers
- [ ] `NOT_FOUND` is thrown for wrong-org access (never `FORBIDDEN` — don't reveal existence)
