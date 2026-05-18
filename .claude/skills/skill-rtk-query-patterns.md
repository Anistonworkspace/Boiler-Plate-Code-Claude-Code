# Skill — RTK Query Patterns

These are the only correct ways to call APIs and manage server state in the frontend.

---

## API slice structure (one file per feature)

```typescript
// frontend/src/features/employee/employee.api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Employee, ApiResponse, PaginationMeta } from '@boilerplate/shared';

export const employeeApi = createApi({
  reducerPath: 'employeeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Employee'],
  endpoints: (builder) => ({
    listEmployees: builder.query<{ data: Employee[]; meta: PaginationMeta }, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/employees', params }),
      providesTags: (result) =>
        result
          ? [...result.data.map(({ id }) => ({ type: 'Employee' as const, id })), { type: 'Employee', id: 'LIST' }]
          : [{ type: 'Employee', id: 'LIST' }],
    }),

    getEmployee: builder.query<Employee, string>({
      query: (id) => `/employees/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Employee', id }],
    }),

    createEmployee: builder.mutation<Employee, Partial<Employee>>({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),

    updateEmployee: builder.mutation<Employee, { id: string; body: Partial<Employee> }>({
      query: ({ id, body }) => ({ url: `/employees/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),

    deleteEmployee: builder.mutation<void, string>({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
  }),
});

export const {
  useListEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;
```

## Component consuming RTK Query

```typescript
// ✅ CORRECT — handles all 3 states: loading, error, data
export function EmployeeList() {
  const { data, isLoading, isError } = useListEmployeesQuery({ page: 1, limit: 20 });
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError) return <p className="text-red-500">Failed to load employees.</p>;

  const handleCreate = async (values: CreateEmployeeInput) => {
    try {
      await createEmployee(values).unwrap();
      toast.success('Employee created');
    } catch {
      toast.error('Failed to create employee');
    }
  };

  return <div>{data?.data.map(emp => <EmployeeCard key={emp.id} employee={emp} />)}</div>;
}
```

## NEVER do this

```typescript
// ❌ WRONG — raw fetch instead of RTK Query
const response = await fetch('/api/employees');
const data = await response.json();

// ❌ WRONG — copying server data into Redux slice
dispatch(setEmployees(data)); // server data belongs in RTK Query cache, not Redux

// ❌ WRONG — mutation without invalidatesTags (list won't refresh)
createEmployee: builder.mutation({
  query: (body) => ({ url: '/employees', method: 'POST', body }),
  // missing invalidatesTags!
}),
```

## providesTags / invalidatesTags rules

| Endpoint type | providesTags | invalidatesTags |
|--------------|--------------|-----------------|
| list query | `[{ type: 'X', id: 'LIST' }]` | — |
| single query | `[{ type: 'X', id }]` | — |
| create mutation | — | `[{ type: 'X', id: 'LIST' }]` |
| update mutation | — | `[{ type: 'X', id }, { type: 'X', id: 'LIST' }]` |
| delete mutation | — | `[{ type: 'X', id: 'LIST' }]` |
