#!/bin/bash
# UserPromptSubmit hook — fires before every user message.
# Detects the intent of the user's prompt and injects agent/skill dispatch
# instructions into Claude's context. This makes agents fire automatically
# without the fresher needing to name any agent explicitly.
#
# Claude Code reads this script's stdout as additional context.

set -uo pipefail

INPUT=$(cat)

# ── Extract prompt text from JSON payload ────────────────────────────────────
PROMPT=""

if command -v python3 &>/dev/null; then
  PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Try top-level prompt field first
    p = str(data.get('prompt', '') or data.get('message', '') or data.get('content', '') or '')
    # Try messages array (last user message)
    if not p:
        for m in reversed(data.get('messages', [])):
            if isinstance(m, dict) and m.get('role') == 'user':
                c = m.get('content', '')
                if isinstance(c, str):
                    p = c
                elif isinstance(c, list):
                    for block in reversed(c):
                        if isinstance(block, dict) and block.get('type') == 'text':
                            p = block.get('text', '')
                            break
                if p:
                    break
    print(p[:3000])
except Exception:
    print('')
" 2>/dev/null || echo "")
fi

# Fallback: extract first string value from JSON using grep
if [ -z "$PROMPT" ]; then
  PROMPT=$(echo "$INPUT" | grep -oE '"(prompt|message|content)"\s*:\s*"[^"]{5,}"' 2>/dev/null \
    | head -1 | sed 's/.*": "//' | sed 's/"$//' || echo "")
fi

# If still empty, skip dispatch (don't inject noise for system messages)
if [ -z "$PROMPT" ]; then
  exit 0
fi

P=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# ── Keyword → dispatch mapping ───────────────────────────────────────────────
AGENTS=()
SKILLS=()
RULES=()

# UI / Design / Frontend visuals
if echo "$P" | grep -qE "ui|ux|component|page|screen|design|layout|style|color|button|form|modal|sidebar|header|nav|card|table|icon|theme|dark mode|responsive|mobile|animation|tailwind|css"; then
  AGENTS+=("agent-ui-ux" "agent-frontend-wiring")
  SKILLS+=("skill-ui-ux-checklist.md" "skill-rtk-query-patterns.md")
  RULES+=("rule-frontend.md")
fi

# New module / feature / CRUD scaffold
if echo "$P" | grep -qE "new module|new feature|scaffold|build a|create a|implement|add a|crud|module|feature"; then
  AGENTS+=("agent-planner" "agent-code-review")
  SKILLS+=("skill-mvc-patterns.md" "skill-prisma-patterns.md")
  RULES+=("rule-mvc-architecture.md" "rule-backend.md" "rule-api.md")
fi

# Bug / Error / Fix
if echo "$P" | grep -qE "bug|error|crash|fix|broken|fails|not working|exception|undefined|null|typeerror|500|404|cannot read|cannot find|unexpected"; then
  AGENTS+=("agent-debugger" "agent-logic-analyzer")
  RULES+=("rule-bug-fix-process.md")
fi

# Tests
if echo "$P" | grep -qE "test|spec|coverage|playwright|vitest|unit test|e2e|integration test|write tests|add tests"; then
  AGENTS+=("agent-testing" "agent-test-writer")
  SKILLS+=("skill-testing-patterns.md")
  RULES+=("rule-testing-standards.md")
fi

# Security / Auth / RBAC
if echo "$P" | grep -qE "security|auth|login|jwt|permission|rbac|role|vulnerability|owasp|xss|injection|token|encrypt"; then
  AGENTS+=("agent-api-security" "agent-security")
  SKILLS+=("skill-auth-patterns.md")
  RULES+=("rule-security-rbac.md" "rule-secrets-policy.md")
fi

# Database / Prisma / Migration
if echo "$P" | grep -qE "database|migration|schema|prisma|model|relation|index|seed|column|table|foreign key"; then
  AGENTS+=("agent-database")
  SKILLS+=("skill-prisma-patterns.md")
  RULES+=("rule-database.md" "rule-database-migrations.md")
fi

# DevOps / Deploy / CI
if echo "$P" | grep -qE "deploy|ci|docker|nginx|pm2|github actions|pipeline|release|production|build|workflow"; then
  AGENTS+=("agent-devops")
fi

# Performance / Optimization
if echo "$P" | grep -qE "performance|slow|n\+1|n1|query time|bundle|optimize|cache|paginate|pagination|speed"; then
  AGENTS+=("agent-performance")
  SKILLS+=("skill-prisma-patterns.md")
  RULES+=("rule-api.md")
fi

# State machine / Workflow / Approval
if echo "$P" | grep -qE "workflow|state machine|status|approval|transition|state|leave request|flow|approve|reject"; then
  AGENTS+=("agent-logic-analyzer")
  SKILLS+=("skill-state-machine-patterns.md")
  RULES+=("rule-state-machines.md")
fi

# Audit / Code review
if echo "$P" | grep -qE "review|audit|check|is this correct|is this right|validate|verify"; then
  AGENTS+=("agent-code-review")
fi

# Memory / Session
if echo "$P" | grep -qE "/start|/done|memory|session|context|handoff|compact"; then
  AGENTS+=("agent-memory")
fi

# ── Output dispatch context (only if agents were matched) ────────────────────
if [ ${#AGENTS[@]} -eq 0 ]; then
  # No keyword match — still remind about core rules
  echo "## Auto-context"
  echo "No specific agent triggered. Core rules always apply:"
  echo "- MVC: Controller thin → Service thick (rule-mvc-architecture.md)"
  echo "- Every Prisma query: organizationId + deletedAt:null (rule-security-rbac.md)"
  echo "- Response envelope: { success, data, meta } (rule-api.md)"
  exit 0
fi

# Deduplicate arrays
AGENTS_UNIQUE=($(printf '%s\n' "${AGENTS[@]}" | sort -u))
SKILLS_UNIQUE=($(printf '%s\n' "${SKILLS[@]}" | sort -u))
RULES_UNIQUE=($(printf '%s\n' "${RULES[@]}" | sort -u))

echo "## Auto-dispatch context"
echo ""
echo "**Agents to apply** (read their files in .claude/agents/ and follow their checklists):"
for a in "${AGENTS_UNIQUE[@]}"; do echo "- $a"; done
echo ""
if [ ${#SKILLS_UNIQUE[@]} -gt 0 ]; then
  echo "**Skills to read** (in .claude/skills/ — use these code patterns, not custom ones):"
  for s in "${SKILLS_UNIQUE[@]}"; do echo "- $s"; done
  echo ""
fi
if [ ${#RULES_UNIQUE[@]} -gt 0 ]; then
  echo "**Rules enforced** (in .claude/rules/ — violations must be caught before completing the task):"
  for r in "${RULES_UNIQUE[@]}"; do echo "- $r"; done
  echo ""
fi
echo "**Instructions:** Before writing any code, read the agent files listed above."
echo "Follow their checklists completely. Report findings using their output format."
echo "The user does not need to ask — these agents fire automatically for this task type."

exit 0
