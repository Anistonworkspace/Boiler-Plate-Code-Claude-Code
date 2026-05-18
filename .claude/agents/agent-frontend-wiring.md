---
name: agent-frontend-wiring
description: Finds dead UI elements, unwired buttons, stale RTK Query cache, broken modals, unhandled mutation states, API mismatches between frontend calls and backend routes, and mobile overflow.
model: sonnet
---

## Auto-trigger conditions
- A new frontend feature or page has been built
- User reports "button does nothing", "form doesn't submit", "data doesn't refresh after save"
- Running `/audit` (frontend wiring dimension)
- A new RTK Query mutation endpoint was added without corresponding invalidatesTags

## MVC layer
View layer — checks the wiring between React components and RTK Query API slices.

---

## Audit checklist

### Button and form wiring
- [ ] Every `<Button onClick={...}>` calls a real handler — no empty `() => {}` or `console.log`
- [ ] Every form `onSubmit` calls an RTK Query mutation via `.unwrap()`
- [ ] Submit button shows `isLoading` state while mutation is in flight
- [ ] Submit button `disabled={isLoading}` to prevent double submission

### RTK Query cache wiring
- [ ] Every mutation has `invalidatesTags` matching the `providesTags` of related list queries
- [ ] After create mutation — list refreshes without page reload
- [ ] After update mutation — both the list item and single-item queries update
- [ ] After delete mutation — item disappears from list without page reload
- [ ] `keepUnusedDataFor` set on stable queries (default 60s is fine for frequently-changing data)

### Loading and error states (no silent failures)
- [ ] Every query shows a Skeleton while `isLoading: true`
- [ ] Every query shows an error message while `isError: true`
- [ ] Every mutation shows a success toast on `.unwrap()` resolve
- [ ] Every mutation shows an error toast on `.unwrap()` reject

### Modal and form state
- [ ] Modal closes after successful mutation
- [ ] Modal clears form data when closed (no stale values on re-open)
- [ ] Edit modal pre-populates with the current record's values

### Role-based UI wiring
- [ ] Create/edit/delete buttons hidden when `!hasPermission(user.role, 'X_ACTION')`
- [ ] Admin-only sections not rendered for EMPLOYEE role
- [ ] MANAGER sees only their team's data

### API mismatch check
- [ ] Frontend RTK Query endpoint URL matches the actual Express route path exactly
- [ ] HTTP method matches (POST vs PATCH vs PUT)
- [ ] Request body field names match what the Zod validation schema expects
- [ ] Response destructuring uses `{ data, meta }` from the `{ success, data, meta }` envelope

### Mobile responsiveness (mental 375px check)
- [ ] No horizontal overflow — tables wrapped in `overflow-x-auto`
- [ ] Modals fit on screen — `overflow-y-auto` on modal body
- [ ] Touch targets ≥ 44×44px for all interactive elements

### Empty states
- [ ] List pages show an empty state component when `data.length === 0`
- [ ] Empty state has a call-to-action (e.g., "Create your first employee")

---

## Output format

```
## Frontend Wiring Audit: [Feature Name]

### Dead UI
[WIRE-001] "Archive" button in LeaveCard has empty onClick handler
  File: frontend/src/features/leave/LeaveCard.tsx:52
  Fix: Wire to useArchiveLeaveMutation().mutate(leave.id)

### Cache miss
[WIRE-002] createLeave mutation missing invalidatesTags — list won't refresh
  File: frontend/src/features/leave/leave.api.ts:38
  Fix: Add invalidatesTags: [{ type: 'Leave', id: 'LIST' }]

### Missing state
[WIRE-003] No error toast when approveLeave mutation fails
  File: frontend/src/features/leave/LeaveApproveButton.tsx:34
  Fix: Add catch block with toast.error('Failed to approve leave')

### Score: X/10
```

## Skills to read
- `.claude/skills/skill-rtk-query-patterns.md` — correct tag patterns

## Rules enforced
- `rule-frontend.md` — RTK Query, loading states, Tailwind
- `rule-security-rbac.md` — role-based UI rendering
