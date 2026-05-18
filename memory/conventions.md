# Project Conventions

These conventions are extracted from `.claude/rules/` for fast agent reference. The rule files are the source of truth — this is a digest.

## Code style

- **TypeScript strict** everywhere; no `any`
- **ESM modules** (`type: "module"`); import paths include `.js` suffix in backend (NodeNext semantics)
- **camelCase** for variables/functions; **PascalCase** for components and types
- **UUID v4** for all IDs (never auto-increment ints)
- **ISO 8601** for dates over the wire
- **INR / en-IN** for currency formatting (override per locale)

## API contracts

- Every response uses the envelope:
  - Success: `{ "success": true, "data": ..., "meta": { page, limit, total } }`
  - Error: `{ "success": false, "error": { "code", "message", "details?" } }`
- HTTP codes: 200 (GET/PATCH), 201 (POST create), 400 (validation), 401 (no auth), 403 (RBAC), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error)
- Rate limits: auth routes 50/15min, general 100/min
- Pagination: every list endpoint accepts `?page=1&limit=20`

## Backend module pattern

Every feature lives in `backend/src/modules/<name>/` and contains exactly four files:

- `<name>.routes.ts` — Express router; middleware order is **authenticate → requirePermission → validate → controller**
- `<name>.controller.ts` — thin: parse req → call service → respond. Always `try/catch` with `next(err)`.
- `<name>.service.ts` — all business logic. Throws `AppError` subclasses. **Always** includes `organizationId` in queries. Uses `prisma.$transaction` for multi-table writes. Calls `audit(...)` on every create/update/delete.
- `<name>.validation.ts` — Zod schemas for each operation.

## Frontend feature pattern

Every feature lives in `frontend/src/features/<name>/` and typically contains:

- `<name>Api.ts` — RTK Query endpoint slice with proper `providesTags` / `invalidatesTags`
- `<name>Slice.ts` — only if local state is needed (auth has this; most don't)
- `<Name>Page.tsx` — page component
- Sub-components as needed

## Multi-tenancy (binding)

- **Every** Prisma query on an org-scoped table includes `organizationId` from `req.user.organizationId` (NOT from request body).
- **Every** `findUnique` / `findMany` / `update` / `delete` enforces this.
- Soft delete: filter `deletedAt: null` on reads. Set `deletedAt: new Date()` on delete.

## Security

- Passwords: bcrypt 12 rounds minimum
- Sensitive fields (Aadhaar, PAN, bank): AES-256-GCM via `utils/encryption.ts`, suffix the field with `Encrypted`
- JWT access token: 15min TTL, in `Authorization: Bearer ...` header
- Refresh token: 7d TTL, in **httpOnly cookie** (`/api/auth` path), sha256 hash stored in DB
- File uploads: validate **both** MIME type AND extension; size limit 10MB default
- CORS: explicit origin whitelist (never `*`) for authenticated routes
- Never expose raw Prisma errors to clients (errorHandler sanitizes)

## RBAC

- Roles: `SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE`
- Permissions matrix: `shared/src/permissions.ts` (canonical)
- `requirePermission(resource, action)` middleware enforces on each route
- Self-approval guard: every approval endpoint must check `approverId !== requesterId`
- Manager scope: MANAGER can only act on their direct reports
- Role escalation: only SUPER_ADMIN can create ADMIN; `req.body.role` is **ignored** on assignment

## Database

- Every model has: `id (UUID)`, `organizationId` (where applicable), `createdAt`, `updatedAt`, `deletedAt (DateTime?)`
- Indexes: always `@@index([organizationId])` plus any frequently-filtered field
- Enums declared in **both** `schema.prisma` AND `shared/src/enums.ts` with identical values
- Production: NEVER `db:push` — always `migrate deploy`. NEVER edit applied migrations.

## UI / UX

- Brand color: indigo-600 (`#4f46e5`)
- Fonts: **Sora** (headings), **DM Sans** (body), **JetBrains Mono** (data/numbers)
- Style: glassmorphism — layered shadows, `backdrop-blur`
- Tailwind only — no inline styles
- Forms: React Hook Form + Zod resolver (always)
- API calls: RTK Query hooks only — never raw `fetch()`
- Loading: `Loader2` spinner from lucide-react, or skeleton
- Toasts: `react-hot-toast`
- Animations: Framer Motion via the shared variants in `frontend/src/lib/animations.ts`

## State machines

When a model has a status field (e.g. `ApprovalStatus`):

- List all valid transitions in code or comments
- Every transition has a role check
- Terminal states (e.g. `CANCELLED`) are irreversible without an explicit re-open mechanism
- Use Prisma optimistic-lock pattern: `updateMany` with the old status in the `where` clause

## Testing

- Coverage targets: backend service layer ≥ 80%, utilities ≥ 90%, critical frontend components ≥ 70%
- Unit: Vitest
- Integration: supertest against real test DB (not mocks)
- E2E: Playwright

## Git

- Never push to main without explicit approval
- Never force-push to shared branches
- Never `--no-verify`, never `--no-gpg-sign`
- Never use `git worktree add` in this project

## Releases

- Mobile: build APK/AAB in `store-releases/android/` (signed with release keystore in GitHub secrets)
- iOS: build IPA in `store-releases/ios/`
- Desktop: build Windows EXE in `store-releases/electron/`
- Never commit: `*.jks`, `*.keystore`, `*.apk`, `*.aab`, `*.ipa`, `*.exe`, `google-services.json`, `GoogleService-Info.plist`
