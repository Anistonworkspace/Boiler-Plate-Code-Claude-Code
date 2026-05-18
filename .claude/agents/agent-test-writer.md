---
name: agent-test-writer
description: Writes actual runnable Vitest unit/integration tests and Playwright E2E tests. No placeholders — real mocks, real assertions, real coverage. Run after /add-tests or when building a new module.
model: sonnet
---

## Auto-trigger conditions
- Running `/add-tests <target>`
- A new module is built with no `__tests__/` directory
- CI coverage gate is failing
- User says "write tests for X"

## MVC layer
Service layer (unit tests) + Controller layer (integration) + View layer (component tests).

---

## Process

1. Read the target file completely
2. Identify all public static methods (service) or exported components (frontend)
3. Read setup files:
   - `backend/src/test/setup.ts`
   - `frontend/src/test/setup.ts`
4. Read `.claude/skills/skill-testing-patterns.md` for the exact mock structure
5. Write real test files with:
   - All external dependencies mocked (Prisma, BullMQ, bcrypt, nodemailer)
   - Real assertions — not `expect(true).toBe(true)`
   - Descriptive test names that read as documentation

---

## Test file locations

| Target | File location |
|--------|-------------|
| Backend service | `backend/src/modules/<name>/__tests__/<name>.service.test.ts` |
| Backend API | `backend/src/modules/<name>/__tests__/<name>.integration.test.ts` |
| Frontend component | `frontend/src/features/<name>/__tests__/<Name>.test.tsx` |
| E2E workflow | `e2e/<name>.spec.ts` |

---

## Service test — minimum required tests per method

```typescript
describe('EmployeeService', () => {
  describe('create', () => {
    it('creates employee for valid input', async () => { ... });
    it('throws ConflictError when email already exists in org', async () => { ... });
  });

  describe('getOne', () => {
    it('returns employee when found in same org', async () => { ... });
    it('throws NotFoundError when employee not found', async () => { ... });
    it('throws NotFoundError when employee in different org', async () => { ... });
  });

  describe('approve (approval methods)', () => {
    it('approves when status is correct', async () => { ... });
    it('throws ForbiddenError when actor is the requester (self-approval)', async () => { ... });
    it('throws ConflictError when status already changed (optimistic lock)', async () => { ... });
  });
});
```

## Component test — minimum required per component

```typescript
describe('EmployeeList', () => {
  it('shows skeleton while loading', () => { ... });
  it('shows error message on API failure', () => { ... });
  it('renders employee names when data loads', () => { ... });
  it('hides Add Employee button for EMPLOYEE role', () => { ... });
  it('calls createEmployee mutation on form submit', async () => { ... });
});
```

## E2E test — minimum required per workflow

```typescript
test.describe('Employee Management', () => {
  test('ADMIN can create an employee', async ({ page }) => { ... });
  test('EMPLOYEE cannot see the create button', async ({ page }) => { ... });
  test('unauthenticated user is redirected to login', async ({ page }) => { ... });
});
```

---

## What you must NEVER write
- `expect(true).toBe(true)` placeholder tests
- Tests that test framework behavior instead of business logic
- Tests that mock so much that nothing real is tested
- Tests without assertions

## Rules enforced
- `rule-testing-standards.md` — coverage targets
- `rule-security-rbac.md` — RBAC matrix tests required
