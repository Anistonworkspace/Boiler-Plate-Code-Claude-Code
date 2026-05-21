# /project-init — Initialize boilerplate for a new project

Run this once when starting a new project from this boilerplate.
It updates CLAUDE.md, project-state.md, and creates a project-specific ADR.

---

## When to run

Type `/project-init` (optionally followed by the project name and description) when:
- You've cloned/forked this boilerplate for a new project
- The project is being renamed from "Boilerplate App" to its real name
- You want to record the founding architecture decisions as ADRs

Example usage:
```
/project-init HRease — HR and payroll management for SMEs
/project-init FleetView — fleet tracking SaaS for logistics companies
/project-init
```

---

## Steps the agent executes

### 1. Gather project identity (ask user if not in the prompt)

Collect:
- **Project name** — short PascalCase (e.g. `HRease`, `FleetView`)
- **Project slug** — kebab-case for IDs and package names (e.g. `hrease`, `fleet-view`)
- **One-line description** — what the app does and who it is for
- **Primary target platforms** — select from: Web PWA / Android APK / iOS IPA / Windows EXE
- **App domain** — e.g. HR, logistics, finance, education, healthcare
- **Primary user roles** (comma-separated) — e.g. Admin, Manager, Employee

### 2. Update CLAUDE.md title block

Find and replace the boilerplate heading:
```
# Boilerplate App — AI Agent Entry Point
```
→
```
# <ProjectName> — AI Agent Entry Point
```

And update the description paragraph under "What is this project?":
```
Production-grade fullstack PWA boilerplate by Aniston Technologies LLP.
```
→
```
<ProjectDescription>
Built on the Aniston Technologies LLP production-grade boilerplate.
```

### 3. Update memory/project-state.md

Set:
- `project_name` → real project name
- `project_slug` → kebab-case slug
- `description` → one-liner
- `target_platforms` → checked list matching user selection
- `status` → `bootstrapping`
- `started_at` → today's date (YYYY-MM-DD)
- Clear the "Recent Changes" section and start fresh

### 4. Update root package.json name

Change:
```json
"name": "boilerplate-app"
```
→
```json
"name": "<project-slug>"
```

### 5. Update frontend/package.json name

Change:
```json
"name": "@boilerplate/frontend"
```
→
```json
"name": "@<project-slug>/frontend"
```

Apply the same pattern to backend and shared package names.

### 6. Update frontend/index.html

- `<title>Boilerplate App</title>` → `<title><ProjectName></title>`
- `<meta name="application-name" content="Boilerplate App">` → real name
- `<meta name="description" content="...">` → one-liner description

### 7. Update frontend/vite.config.ts PWA manifest

```typescript
manifest: {
  name: '<ProjectName>',
  short_name: '<ShortName>',          // ≤12 chars for home screen
  description: '<one-liner>',
  // ... rest unchanged
}
```

### 8. Update agent-desktop/package.json (if desktop target selected)

```json
"productName": "<ProjectName>",
"appId": "com.<org-slug>.<project-slug>"
```

### 9. Write project-init ADR

Create `memory/decisions/ADR-NNNN-project-init-<project-slug>.md` with:
- Title: "Project Init — <ProjectName>"
- Status: Accepted
- Date: today
- Context: what the app does, who it is for, why this boilerplate was chosen
- Decision: target platforms, primary roles, key domain
- Consequences: which skills/agents are most relevant, what to build first

### 10. Confirm and summarize

Print a table showing every file changed, what changed, and the new value.
Tell the user: "Run `/build <first-module>` to scaffold your first feature."

---

## What this command does NOT change

- Prisma schema — the existing auth/org/user models remain unchanged
- .claude/agents/, .claude/skills/, .claude/rules/ — these are project-agnostic
- Docker/Nginx/CI configs — update manually to match your infra
- .env.example — update manually to add project-specific variables
