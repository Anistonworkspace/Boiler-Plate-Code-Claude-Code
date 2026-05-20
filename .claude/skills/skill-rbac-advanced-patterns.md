# Skill — RBAC Advanced Patterns

Dynamic permissions, resource ownership guards, manager-team scoping, multi-role edge cases.

---

## Permission registry (shared)

```typescript
// shared/src/permissions.ts
export enum Permission {
  // Employee
  EMPLOYEE_VIEW        = 'EMPLOYEE_VIEW',
  EMPLOYEE_CREATE      = 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE      = 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE      = 'EMPLOYEE_DELETE',

  // Leave
  LEAVE_VIEW_OWN       = 'LEAVE_VIEW_OWN',
  LEAVE_VIEW_TEAM      = 'LEAVE_VIEW_TEAM',
  LEAVE_VIEW_ALL       = 'LEAVE_VIEW_ALL',
  LEAVE_SUBMIT         = 'LEAVE_SUBMIT',
  LEAVE_APPROVE        = 'LEAVE_APPROVE',
  LEAVE_CANCEL         = 'LEAVE_CANCEL',

  // Payroll
  PAYROLL_VIEW_OWN     = 'PAYROLL_VIEW_OWN',
  PAYROLL_VIEW_ALL     = 'PAYROLL_VIEW_ALL',
  PAYROLL_PROCESS      = 'PAYROLL_PROCESS',

  // Settings
  ORG_SETTINGS_VIEW    = 'ORG_SETTINGS_VIEW',
  ORG_SETTINGS_UPDATE  = 'ORG_SETTINGS_UPDATE',

  // Audit
  AUDIT_LOG_VIEW       = 'AUDIT_LOG_VIEW',
}

// Map each role to its permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),    // all
  ADMIN: [
    Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_CREATE,
    Permission.EMPLOYEE_UPDATE, Permission.EMPLOYEE_DELETE,
    Permission.LEAVE_VIEW_ALL, Permission.LEAVE_APPROVE, Permission.LEAVE_CANCEL,
    Permission.PAYROLL_VIEW_ALL, Permission.PAYROLL_PROCESS,
    Permission.ORG_SETTINGS_VIEW, Permission.ORG_SETTINGS_UPDATE,
    Permission.AUDIT_LOG_VIEW,
  ],
  MANAGER: [
    Permission.EMPLOYEE_VIEW,
    Permission.LEAVE_VIEW_TEAM, Permission.LEAVE_APPROVE, Permission.LEAVE_CANCEL, Permission.LEAVE_SUBMIT,
    Permission.PAYROLL_VIEW_OWN,
  ],
  EMPLOYEE: [
    Permission.LEAVE_VIEW_OWN, Permission.LEAVE_SUBMIT, Permission.LEAVE_CANCEL,
    Permission.PAYROLL_VIEW_OWN,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

---

## Backend `requirePermission` middleware

```typescript
// backend/src/middleware/auth.ts
import { ROLE_PERMISSIONS, type Permission } from '@boilerplate/shared';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new UnauthorizedError('Not authenticated'));

    const perms = ROLE_PERMISSIONS[user.role] ?? [];
    if (!perms.includes(permission)) {
      return next(new ForbiddenError(`Permission required: ${permission}`));
    }

    next();
  };
}

// Multi-permission check — user needs ALL permissions
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = ROLE_PERMISSIONS[req.user.role] ?? [];
    const missing = permissions.filter(p => !perms.includes(p));
    if (missing.length > 0) {
      return next(new ForbiddenError(`Missing permissions: ${missing.join(', ')}`));
    }
    next();
  };
}

// Any-of check — user needs at least one
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = ROLE_PERMISSIONS[req.user.role] ?? [];
    if (!permissions.some(p => perms.includes(p))) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
```

---

## Resource ownership guard

```typescript
// backend/src/utils/ownershipGuard.ts

// Guard: the actor can only act on their OWN record (unless admin)
export function assertOwnerOrAdmin(
  resourceOwnerId: string,
  actor: AuthUser,
  message = 'You can only perform this action on your own record',
) {
  const isOwner = actor.employeeId === resourceOwnerId || actor.id === resourceOwnerId;
  const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(actor.role);

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(message);
  }
}

// Usage in service:
static async getPayslip(id: string, actor: AuthUser) {
  const payslip = await prisma.payslip.findFirst({
    where: { id, organizationId: actor.organizationId, deletedAt: null },
  });
  if (!payslip) throw new NotFoundError('Payslip not found');

  // Employee can only see their own payslip
  assertOwnerOrAdmin(payslip.employeeId, actor);

  return payslip;
}
```

---

## Manager-team scope

```typescript
// backend/src/utils/managerScope.ts

// Build the organizationId + employee scope based on role
export async function buildEmployeeScope(
  actor: AuthUser,
  extraWhere: Prisma.EmployeeWhereInput = {},
): Promise<Prisma.EmployeeWhereInput> {
  const base: Prisma.EmployeeWhereInput = {
    organizationId: actor.organizationId,
    deletedAt: null,
    ...extraWhere,
  };

  if (actor.role === UserRole.MANAGER) {
    // Manager sees only their direct reports
    const teamIds = await prisma.employee.findMany({
      where: { managerId: actor.employeeId, organizationId: actor.organizationId, deletedAt: null },
      select: { id: true },
    });
    base.id = { in: teamIds.map(e => e.id) };
  }

  // ADMIN / SUPER_ADMIN: no extra filter — sees all
  // EMPLOYEE: should not call this function (use assertOwnerOrAdmin instead)
  return base;
}

// Usage in service:
static async list(query: ListLeaveQuery, actor: AuthUser) {
  const where = await buildEmployeeScope(actor, {
    // Additional leave-specific filters applied here
  });
  // ...
}
```

---

## Self-approval prevention guard

```typescript
// CRITICAL — must exist on every approval endpoint
export function assertNotSelfApproval(requesterId: string, actor: AuthUser) {
  // Compare employee IDs, not user IDs (they may differ)
  if (actor.employeeId && actor.employeeId === requesterId) {
    throw new ForbiddenError('You cannot approve your own request');
  }
  if (actor.id === requesterId) {
    throw new ForbiddenError('You cannot approve your own request');
  }
}

// Usage:
static async approveLeave(id: string, actor: AuthUser) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id, organizationId: actor.organizationId, deletedAt: null },
  });
  if (!leave) throw new NotFoundError('Leave request not found');

  assertNotSelfApproval(leave.employeeId, actor);  // ← CRITICAL

  // Proceed with approval...
}
```

---

## Role escalation prevention

```typescript
// Only SUPER_ADMIN can assign ADMIN role
// Only ADMIN / SUPER_ADMIN can assign MANAGER role
export function assertCanAssignRole(targetRole: UserRole, actor: AuthUser) {
  if (targetRole === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot create SUPER_ADMIN users via API');
  }
  if (targetRole === UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Only SUPER_ADMIN can create ADMIN users');
  }
  if (targetRole === UserRole.MANAGER && ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(actor.role)) {
    throw new ForbiddenError('Only ADMIN can create MANAGER users');
  }
}

// In user creation service:
static async create(dto: CreateUserInput, actor: AuthUser) {
  assertCanAssignRole(dto.role, actor);
  // Never set role from dto directly — set it after the guard passes
  const user = await prisma.user.create({
    data: { ...dto, organizationId: actor.organizationId, role: dto.role },
  });
  return user;
}
```

---

## Frontend permission hooks

```typescript
// frontend/src/hooks/usePermissions.ts
import { useSelector } from 'react-redux';
import { ROLE_PERMISSIONS, type Permission } from '@boilerplate/shared';

export function usePermission(permission: Permission): boolean {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function usePermissions(...permissions: Permission[]): Record<Permission, boolean> {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const perms = role ? (ROLE_PERMISSIONS[role] ?? []) : [];
  return Object.fromEntries(
    permissions.map(p => [p, perms.includes(p)])
  ) as Record<Permission, boolean>;
}

// Usage in component:
function LeaveActions({ leave }: { leave: LeaveRequest }) {
  const canApprove = usePermission(Permission.LEAVE_APPROVE);
  const canCancel  = usePermission(Permission.LEAVE_CANCEL);

  return (
    <div className="flex gap-2">
      {canApprove && <button className="btn btn--positive btn--sm">Approve</button>}
      {canCancel  && <button className="btn btn--negative btn--sm">Cancel</button>}
    </div>
  );
}
```

---

## Permission guard component

```typescript
// frontend/src/components/auth/PermissionGuard.tsx
interface PermissionGuardProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const allowed = usePermission(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Role guard for coarser checks
export function RoleGuard({ roles, children, fallback = null }: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  return role && roles.includes(role) ? <>{children}</> : <>{fallback}</>;
}

// Usage:
<PermissionGuard permission={Permission.EMPLOYEE_CREATE}>
  <button className="btn btn--primary">Add Employee</button>
</PermissionGuard>

<RoleGuard roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
  <AdminSettingsPanel />
</RoleGuard>
```

---

## Checklist

- [ ] All permissions defined in `shared/src/permissions.ts` — NOT scattered in service files
- [ ] `ROLE_PERMISSIONS` map covers every role × permission combination
- [ ] `requirePermission()` used on every route — no route skips it
- [ ] `assertOwnerOrAdmin()` called on every endpoint that touches user-specific data
- [ ] `assertNotSelfApproval()` called on EVERY approval endpoint — critical
- [ ] `buildEmployeeScope()` called in every list/search that a MANAGER can access
- [ ] Role escalation guard: no API can create ADMIN without SUPER_ADMIN actor
- [ ] Frontend `PermissionGuard` wraps every admin-only UI element
- [ ] RBAC test matrix: every critical route tested with all 4 roles (403 for unauthorized, 200 for authorized)
