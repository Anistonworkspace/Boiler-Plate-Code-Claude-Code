# Skill — Authentication and RBAC Patterns

---

## JWT + HttpOnly cookie flow

```
Login → accessToken (15min, Authorization header) + refreshToken (7d, httpOnly cookie)
Request → Bearer <accessToken> in Authorization header
Expired → 401 → client calls /auth/refresh (cookie sent automatically) → new accessToken
Logout → DELETE /auth/logout → server deletes refreshToken from DB
```

## Auth middleware (what req.user looks like after authenticate)

```typescript
// Set by authenticate middleware from JWT payload
req.user = {
  id: 'user-uuid',
  email: 'user@example.com',
  role: 'MANAGER',             // UserRole enum
  organizationId: 'org-uuid',  // ALWAYS use this, never trust req.body.organizationId
  name: 'John Doe',
};
```

## requirePermission usage

```typescript
// In routes — check the permissions matrix in shared/src/permissions.ts
router.post('/', authenticate, requirePermission('EMPLOYEE_CREATE'), validateRequest(...), controller);

// In service — additional granular checks if needed
if (actor.role === 'MANAGER' && record.managerId !== actor.id) {
  throw new ForbiddenError('Managers can only act on their direct reports');
}
```

## Permissions matrix (shared/src/permissions.ts)

```typescript
// Add new permissions here when creating a new module
export const PERMISSIONS = {
  EMPLOYEE_VIEW:   [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
  EMPLOYEE_CREATE: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  EMPLOYEE_UPDATE: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  EMPLOYEE_DELETE: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  // add new module permissions here
};
```

## Self-approval prevention (MANDATORY on every approval endpoint)

```typescript
// ✅ CORRECT — check in service, not controller
static async approve(id: string, actor: AuthUser) {
  const request = await this.getOne(id, actor);
  if (request.requesterId === actor.id) {
    throw new ForbiddenError('You cannot approve your own request');
  }
  // proceed with approval
}
```

## Manager scope (MANAGER sees only direct reports)

```typescript
// ✅ CORRECT — filter by managerId for MANAGER role
const where: Prisma.EmployeeWhereInput = {
  organizationId: actor.organizationId,
  deletedAt: null,
  ...(actor.role === UserRole.MANAGER ? { managerId: actor.id } : {}),
};
```

## Frontend RBAC (hide admin-only UI)

```typescript
import { hasPermission } from '@boilerplate/shared';

// ✅ CORRECT — hide button if role doesn't have permission
{hasPermission(user.role, 'EMPLOYEE_CREATE') && (
  <Button onClick={openCreateModal}>Add Employee</Button>
)}
```

## Encryption for sensitive fields

```typescript
import { encrypt, decrypt } from '../../utils/encryption.js';

// On save — field name must end in Encrypted
const bankAccountNumberEncrypted = encrypt(dto.bankAccountNumber);

// On read
const bankAccountNumber = decrypt(record.bankAccountNumberEncrypted);
```
