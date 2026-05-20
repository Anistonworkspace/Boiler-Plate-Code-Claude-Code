# Auto-Dispatch Table

This file is read by the `on-prompt.sh` hook before every user message.
Claude Code injects the matching rows as context so the right agent fires automatically.

## Keyword → Agent → Skills

| Trigger keywords | Primary agent | Skills to load |
|-----------------|---------------|----------------|
| ui, component, page, screen, design, layout, style, color, button, form, modal, sidebar, header, nav, card, table, icon, theme, dark mode, responsive, mobile, animation, tailwind | `agent-ui-ux` → `agent-frontend-wiring` | `skill-ui-ux-checklist.md`, `skill-rtk-query-patterns.md`, `skill-form-patterns.md`, `skill-table-patterns.md`, `skill-modal-patterns.md` |
| module, feature, crud, build, scaffold, new, create a, add a, implement | `agent-planner` → `agent-code-review` | `skill-mvc-patterns.md`, `skill-prisma-patterns.md`, `skill-audit-log-patterns.md` |
| bug, error, crash, fix, broken, fails, not working, exception, undefined, null, TypeError, 500, 404 | `agent-debugger` → `agent-logic-analyzer` | `skill-error-handling-patterns.md` |
| test, spec, coverage, playwright, vitest, unit test, e2e, integration test | `agent-testing` → `agent-test-writer` | `skill-testing-patterns.md` |
| security, auth, login, jwt, permission, rbac, role, vulnerability, owasp, xss, injection, encrypt | `agent-api-security` → `agent-security` | `skill-auth-patterns.md`, `skill-rbac-advanced-patterns.md`, `skill-encryption-patterns.md`, `skill-input-sanitization-patterns.md` |
| database, migration, schema, prisma, model, relation, index, seed, column | `agent-database` | `skill-prisma-patterns.md` |
| deploy, ci, docker, nginx, pm2, github actions, pipeline, release, production | `agent-devops` | `skill-monitoring-patterns.md` |
| performance, slow, n+1, query time, bundle, optimize, cache, paginate, infinite scroll | `agent-performance` | `skill-prisma-patterns.md`, `skill-caching-patterns.md`, `skill-infinite-scroll-patterns.md` |
| workflow, state, status, approval, transition, leave, request, flow | `agent-logic-analyzer` | `skill-state-machine-patterns.md` |
| log, audit, monitor, health, alert, trace, observability, sentry | `agent-observability` | `skill-audit-log-patterns.md`, `skill-monitoring-patterns.md` |
| review, check, audit, is this correct, is this right | `agent-code-review` | (all skills relevant to changed files) |
| /start, /done, memory, session, context, handoff | `agent-memory` | (none) |
| socket, realtime, websocket, notification, push, bell | `agent-frontend-wiring` | `skill-socket-patterns.md`, `skill-notification-patterns.md` |
| upload, file, image, photo, csv, import, export, pdf, excel | `agent-planner` | `skill-file-upload-patterns.md`, `skill-report-export-patterns.md`, `skill-bulk-operations-patterns.md` |
| pwa, offline, service worker, install prompt, workbox, capacitor, android, ios, mobile app | `agent-ui-ux` | `skill-pwa-patterns.md`, `skill-capacitor-patterns.md` |
| electron, desktop, tray, windows app | `agent-devops` | `skill-electron-patterns.md` |
| chart, graph, dashboard, kpi, stats, analytics | `agent-ui-ux` | `skill-chart-patterns.md` |
| webhook, integration, hmac, outgoing, incoming | `agent-api-security` | `skill-webhook-patterns.md` |
| i18n, locale, language, translation, hindi, arabic, rtl | `agent-ui-ux` | `skill-i18n-patterns.md` |
| multi-tenant, org, organization, subdomain, plan, subscription | `agent-planner` | `skill-multitenancy-patterns.md` |
| bulk, batch, csv import, mass update, multiple select | `agent-planner` | `skill-bulk-operations-patterns.md` |

## Dispatch instruction template

When Claude detects a keyword match it MUST output (internally, before responding):

```
[AUTO-DISPATCH] Detected: <keyword>
Invoking: <agent name>
Reading skills: <skill files>
Applying rules: <rule files>
```

Then proceed with the task using those agents and skills.
