---
# Naming Conventions — Binding for ALL code in this project

## TypeScript / JavaScript

| Thing | Convention | Example |
|-------|-----------|---------|
| Variables | camelCase | `totalEmployees`, `isLoading` |
| Functions | camelCase | `formatDate()`, `buildWhereClause()` |
| React components | PascalCase | `EmployeeCard`, `LeaveRequestModal` |
| Types / Interfaces | PascalCase | `CreateEmployeeInput`, `AuthUser` |
| Enums | PascalCase (type) + SCREAMING_SNAKE (values) | `enum UserRole { SUPER_ADMIN = 'SUPER_ADMIN' }` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_PAGE_LIMIT` |
| Class names | PascalCase | `EmployeeService`, `AuditLogger` |
| Files — backend | kebab-case | `employee.service.ts`, `auth.controller.ts` |
| Files — frontend | PascalCase for components | `EmployeeList.tsx`, `LeaveModal.tsx` |
| Files — frontend utilities | camelCase | `formatDate.ts`, `useAuth.ts` |

## Prisma / Database

| Thing | Convention | Example |
|-------|-----------|---------|
| Model names | PascalCase singular | `Employee`, `LeaveRequest` |
| Field names | camelCase | `firstName`, `organizationId` |
| Encrypted fields | camelCase + `Encrypted` suffix | `aadhaarEncrypted`, `bankAccountEncrypted` |
| Enum names | PascalCase | `UserRole`, `LeaveStatus` |
| Enum values | SCREAMING_SNAKE_CASE | `SUPER_ADMIN`, `PENDING_APPROVAL` |
| Table names (auto) | snake_case plural (Prisma default) | `employees`, `leave_requests` |
| Index names | auto from `@@index` fields | handled by Prisma |

## API Routes

| Pattern | Convention | Example |
|---------|-----------|---------|
| Collection | plural noun | `/api/employees` |
| Single resource | plural noun + ID param | `/api/employees/:id` |
| Sub-resource | nested plural | `/api/employees/:id/documents` |
| Action route | noun + verb (avoid) → prefer status update | `/api/leave-requests/:id` PATCH with `{ status: 'APPROVED' }` |
| Query params | camelCase | `?sortBy=createdAt&sortDir=desc` |
| Always lowercase, hyphenated | | `/api/leave-requests`, NOT `/api/leaveRequests` |

## React / Frontend

| Thing | Convention | Example |
|-------|-----------|---------|
| RTK Query API file | camelCase + `Api` | `employeeApi.ts`, `leaveApi.ts` |
| RTK Query endpoint | camelCase verb + noun | `getEmployees`, `createLeaveRequest` |
| Redux slice | camelCase + `Slice` | `authSlice.ts` |
| Custom hook | `use` prefix + PascalCase | `useEmployeeList`, `useLeaveFilters` |
| Feature folder | camelCase | `features/employees/`, `features/leave/` |
| CSS class names | kebab-case (Tailwind utility only) | `floating-card`, `btn--primary` |
| CSS custom properties | kebab-case with `--` prefix | `--primary-color`, `--border-radius-medium` |

## Files and Folders

| Location | Convention | Example |
|----------|-----------|---------|
| Backend module folder | camelCase | `backend/src/modules/employee/` |
| Frontend feature folder | camelCase | `frontend/src/features/employees/` |
| Shared schema files | camelCase + `.schema.ts` | `auth.schema.ts`, `common.schema.ts` |
| Test files | same name + `__tests__/` + `.test.ts` | `employee.service.test.ts` |
| Prisma migrations | auto-generated | handled by Prisma |

## IDs and Keys

- All primary keys: UUID v4 (`@default(uuid())`) — NEVER auto-increment integers
- Cache keys: `scope:orgId:resource` or `scope:orgId:resource:id` (see skill-caching-patterns.md)
- Socket room names: `org:<orgId>` or `user:<userId>`
- BullMQ queue names: SCREAMING_SNAKE from `JobQueueName` enum

## NEVER do these

- NEVER abbreviate field names: `empId` → `employeeId`, `orgId` is OK (established prefix)
- NEVER use `data`, `item`, `obj`, `temp` as variable names in production code
- NEVER use plural for Prisma model names (`Employees` → `Employee`)
- NEVER mix conventions in the same file
- NEVER use numbered suffixes: `Component2`, `helper3` — rename to describe purpose
