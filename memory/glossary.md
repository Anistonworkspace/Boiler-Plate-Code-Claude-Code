# Glossary

Project-specific terms. Update when introducing new domain concepts.

## Roles

- **SUPER_ADMIN** — full access across all organizations. Only role allowed to create other ADMINs.
- **ADMIN** — full access within their own organization.
- **MANAGER** — can read/manage employees who report to them directly.
- **EMPLOYEE** — base role; sees their own data and shared resources only.

## Multi-tenancy terms

- **Organization** — a tenant. Every org-scoped record carries `organizationId`. Top-level isolation boundary.
- **Org-scoped** — any model with an `organizationId` field. Queries on these MUST filter by `organizationId`.
- **Global** — record not tied to a specific organization (rare; usually only `Organization` itself).

## Workflow / state

- **Soft delete** — setting `deletedAt: new Date()` rather than removing the row. Filter `deletedAt: null` on reads.
- **Self-approval** — when a user attempts to approve their own request. Always blocked.
- **Terminal state** — a status from which the workflow cannot continue (e.g. `CANCELLED`, `REJECTED`). Reversing requires explicit re-open.

## Security terms

- **AppError** — typed error class hierarchy in `backend/src/middleware/errorHandler.ts`. Subclasses: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`.
- **Encrypted suffix** — sensitive fields end with `Encrypted` (e.g. `aadhaarEncrypted`). Decrypt via `utils/encryption.ts`.
- **httpOnly cookie** — refresh tokens are stored here, inaccessible to JavaScript. Access tokens are short-lived and held in memory only.

## Infrastructure terms

- **Worker** — a BullMQ consumer process started by the backend (`jobs/workers/`). Currently: `email.worker`, `notification.worker`.
- **Queue** — BullMQ queue defined in `jobs/queues.ts`. Currently: `email`, `notification`.
- **Socket room** — Socket.io room naming: `user:<userId>` for per-user notifications, `org:<organizationId>` for org-wide broadcasts.
- **AI service** — Python FastAPI microservice (`ai-service/`) for OCR and AI scoring. Called via `services/ai.service.ts`.

## Memory / coordination terms (this directory)

- **Plan** — a written outline of an upcoming change, stored in `memory/plans/_active/` before execution begins. Required for any non-trivial work.
- **Lock** — a registered claim on one or more files, recorded in `memory/coordination/locks.md`. Held while editing; released when done.
- **Handoff** — a written task transfer from one agent to another, recorded in `memory/coordination/handoffs.md`.
- **Shared context** — cross-agent learnings worth preserving, recorded in `memory/coordination/shared-context.md`.
- **ADR** — Architectural Decision Record. Numbered files in `memory/decisions/` explaining *why* a choice was made.
