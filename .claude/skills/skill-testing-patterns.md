# Skill — Testing Patterns

---

## Service unit test structure (Vitest)

```typescript
// backend/src/modules/employee/__tests__/employee.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeService } from '../employee.service.js';

// 1. Mock all external dependencies
vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    employee: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      employee: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      auditLog: { create: vi.fn() },
    })),
  },
}));

vi.mock('../../../utils/auditLogger.js', () => ({
  auditLogger: { log: vi.fn() },
}));

vi.mock('../../../jobs/queues.js', () => ({
  emailQueue: { add: vi.fn() },
}));

// 2. Import mocks for assertions
import { prisma } from '../../../lib/prisma.js';

// 3. Shared test fixtures
const mockActor = {
  id: 'actor-uuid',
  email: 'admin@example.com',
  role: 'ADMIN',
  organizationId: 'org-uuid',
  name: 'Test Admin',
};

describe('EmployeeService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('create', () => {
    it('creates employee when data is valid', async () => {
      (prisma.employee.findFirst as any).mockResolvedValue(null); // no duplicate

      const result = await EmployeeService.create(
        { name: 'Alice', email: 'alice@example.com', departmentId: 'dept-uuid', designationId: 'des-uuid' },
        mockActor,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws ConflictError when email already exists in org', async () => {
      (prisma.employee.findFirst as any).mockResolvedValue({ id: 'existing' }); // duplicate found

      await expect(
        EmployeeService.create({ name: 'Alice', email: 'alice@example.com', departmentId: 'dept-uuid', designationId: 'des-uuid' }, mockActor)
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('getOne', () => {
    it('throws NotFoundError when employee not in org', async () => {
      (prisma.employee.findFirst as any).mockResolvedValue(null);

      await expect(EmployeeService.getOne('non-existent-id', mockActor))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
```

## Frontend component test (React Testing Library)

```typescript
// frontend/src/features/employee/__tests__/EmployeeList.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeList } from '../EmployeeList.js';

// Mock RTK Query hook
vi.mock('../employee.api.js', () => ({
  useListEmployeesQuery: vi.fn(),
  useCreateEmployeeMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

import { useListEmployeesQuery } from '../employee.api.js';

describe('EmployeeList', () => {
  it('shows skeleton while loading', () => {
    (useListEmployeesQuery as any).mockReturnValue({ isLoading: true });
    render(<EmployeeList />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows error state on failure', () => {
    (useListEmployeesQuery as any).mockReturnValue({ isLoading: false, isError: true });
    render(<EmployeeList />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders employee list when data loads', () => {
    (useListEmployeesQuery as any).mockReturnValue({
      isLoading: false,
      data: { data: [{ id: '1', name: 'Alice' }], meta: { page: 1, limit: 20, total: 1 } },
    });
    render(<EmployeeList />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
```

## Playwright E2E test structure

```typescript
// e2e/employee.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Employee module', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login');
    await page.fill('[name=email]', 'admin@demo.com');
    await page.fill('[name=password]', 'Admin@123');
    await page.click('[type=submit]');
    await page.waitForURL('/dashboard');
  });

  test('ADMIN can create an employee', async ({ page }) => {
    await page.goto('/dashboard/employees');
    await page.click('text=Add Employee');
    await page.fill('[name=name]', 'Test Employee');
    await page.fill('[name=email]', 'test@example.com');
    await page.click('[type=submit]');
    await expect(page.locator('text=Employee created')).toBeVisible();
  });

  test('EMPLOYEE cannot see the create button', async ({ page }) => {
    // Login as employee instead
    await page.goto('/dashboard/employees');
    await expect(page.locator('text=Add Employee')).not.toBeVisible();
  });
});
```

## Coverage requirements

| Layer | Minimum |
|-------|---------|
| Services | ≥ 80% lines |
| Utilities | ≥ 90% lines |
| Frontend components | ≥ 70% lines |

Run: `npm run test:coverage --workspace=backend`
