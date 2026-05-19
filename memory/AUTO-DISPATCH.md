# Auto-Dispatch Table

This file is read by the `on-prompt.sh` hook before every user message.
Claude Code injects the matching rows as context so the right agent fires automatically.

## Keyword → Agent → Skills

| Trigger keywords | Primary agent | Skills to load |
|-----------------|---------------|----------------|
| ui, component, page, screen, design, layout, style, color, button, form, modal, sidebar, header, nav, card, table, icon, theme, dark mode, responsive, mobile, animation, tailwind | `agent-ui-ux` → `agent-frontend-wiring` | `skill-ui-ux-checklist.md`, `skill-rtk-query-patterns.md` |
| module, feature, crud, build, scaffold, new, create a, add a, implement | `agent-planner` → `agent-code-review` | `skill-mvc-patterns.md`, `skill-prisma-patterns.md` |
| bug, error, crash, fix, broken, fails, not working, exception, undefined, null, TypeError, 500, 404 | `agent-debugger` → `agent-logic-analyzer` | (none — diagnose first) |
| test, spec, coverage, playwright, vitest, unit test, e2e, integration test | `agent-testing` → `agent-test-writer` | `skill-testing-patterns.md` |
| security, auth, login, jwt, permission, rbac, role, vulnerability, owasp, xss, injection | `agent-api-security` → `agent-security` | `skill-auth-patterns.md` |
| database, migration, schema, prisma, model, relation, index, seed, column | `agent-database` | `skill-prisma-patterns.md` |
| deploy, ci, docker, nginx, pm2, github actions, pipeline, release, production | `agent-devops` | (none) |
| performance, slow, n+1, query time, bundle, optimize, cache, paginate | `agent-performance` | `skill-prisma-patterns.md` |
| workflow, state, status, approval, transition, leave, request, flow | `agent-logic-analyzer` | `skill-state-machine-patterns.md` |
| log, audit, monitor, health, alert, trace, observability | `agent-observability` | (none) |
| review, check, audit, is this correct, is this right | `agent-code-review` | (all skills relevant to changed files) |
| /start, /done, memory, session, context, handoff | `agent-memory` | (none) |

## Dispatch instruction template

When Claude detects a keyword match it MUST output (internally, before responding):

```
[AUTO-DISPATCH] Detected: <keyword>
Invoking: <agent name>
Reading skills: <skill files>
Applying rules: <rule files>
```

Then proceed with the task using those agents and skills.
