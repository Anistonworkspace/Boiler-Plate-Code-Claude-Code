#!/bin/bash
# UserPromptSubmit hook — fires before every user message.
# Detects the intent of the user's prompt and injects agent/skill dispatch
# instructions into Claude's context so the right agent fires automatically.
#
# Claude Code reads this script's stdout as additional context before responding.

set -uo pipefail

INPUT=$(cat)

# ── Extract prompt text from JSON payload ─────────────────────────────────────
PROMPT=""

if command -v python3 &>/dev/null; then
  PROMPT=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Try top-level prompt/message/content fields
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
    print(p[:4000])
except Exception:
    print('')
" 2>/dev/null || echo "")
fi

# Fallback: extract first string value from JSON using grep
if [ -z "$PROMPT" ]; then
  PROMPT=$(echo "$INPUT" | grep -oE '"(prompt|message|content)"\s*:\s*"[^"]{5,}"' 2>/dev/null \
    | head -1 | sed 's/.*": "//' | sed 's/"$//' || echo "")
fi

# If still empty, skip dispatch
if [ -z "$PROMPT" ]; then
  exit 0
fi

P=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# ── Keyword → dispatch mapping ────────────────────────────────────────────────
AGENTS=()
SKILLS=()
RULES=()

# ─ UI / Design / Frontend visuals ─────────────────────────────────────────────
if echo "$P" | grep -qE "ui|ux|component|page|screen|design|layout|style|color|button|form|modal|sidebar|header|nav|card|table|icon|theme|dark mode|responsive|mobile|animation|tailwind|css|glassmorphism|floating.card"; then
  AGENTS+=("agent-ui-ux" "agent-frontend-wiring")
  SKILLS+=("skill-ui-ux-checklist.md" "skill-rtk-query-patterns.md" "skill-form-patterns.md" "skill-table-patterns.md" "skill-modal-patterns.md")
  RULES+=("rule-frontend.md")
fi

# ─ New module / feature / CRUD scaffold ───────────────────────────────────────
if echo "$P" | grep -qE "new module|new feature|scaffold|build a|create a|implement|add a|crud|module|feature|new endpoint|new route"; then
  AGENTS+=("agent-planner" "agent-code-review")
  SKILLS+=("skill-mvc-patterns.md" "skill-prisma-patterns.md" "skill-audit-log-patterns.md")
  RULES+=("rule-mvc-architecture.md" "rule-backend.md" "rule-api.md")
fi

# ─ Bug / Error / Fix ──────────────────────────────────────────────────────────
if echo "$P" | grep -qE "bug|error|crash|fix|broken|fails|not working|exception|undefined|null|typeerror|500|404|cannot read|cannot find|unexpected|why is|what is wrong"; then
  AGENTS+=("agent-debugger" "agent-logic-analyzer")
  SKILLS+=("skill-error-handling-patterns.md")
  RULES+=("rule-bug-fix-process.md")
fi

# ─ Tests ──────────────────────────────────────────────────────────────────────
if echo "$P" | grep -qE "test|spec|coverage|playwright|vitest|unit test|e2e|integration test|write tests|add tests|testing"; then
  AGENTS+=("agent-testing" "agent-test-writer")
  SKILLS+=("skill-testing-patterns.md")
  RULES+=("rule-testing-standards.md")
fi

# ─ Security / Auth / RBAC / Encryption ───────────────────────────────────────
if echo "$P" | grep -qE "security|auth|login|jwt|permission|rbac|role|vulnerability|owasp|xss|injection|token|encrypt|decrypt|pii|aadhaar|pan card|aes|sensitive data"; then
  AGENTS+=("agent-api-security" "agent-security")
  SKILLS+=("skill-auth-patterns.md" "skill-rbac-advanced-patterns.md" "skill-encryption-patterns.md" "skill-input-sanitization-patterns.md")
  RULES+=("rule-security-rbac.md" "rule-secrets-policy.md")
fi

# ─ Database / Prisma / Migration ──────────────────────────────────────────────
if echo "$P" | grep -qE "database|migration|schema|prisma|model|relation|index|seed|column|table|foreign key|soft delete"; then
  AGENTS+=("agent-database")
  SKILLS+=("skill-prisma-patterns.md")
  RULES+=("rule-database.md" "rule-database-migrations.md")
fi

# ─ DevOps / Deploy / CI ───────────────────────────────────────────────────────
if echo "$P" | grep -qE "deploy|ci|docker|nginx|pm2|github actions|pipeline|release|production|build|workflow|devops"; then
  AGENTS+=("agent-devops")
  SKILLS+=("skill-monitoring-patterns.md")
fi

# ─ Performance / Optimization / Caching ──────────────────────────────────────
if echo "$P" | grep -qE "performance|slow|n\+1|n1|query time|bundle|optimize|cache|paginate|pagination|speed|redis cache"; then
  AGENTS+=("agent-performance")
  SKILLS+=("skill-prisma-patterns.md" "skill-caching-patterns.md")
  RULES+=("rule-api.md")
fi

# ─ State machine / Workflow / Approval ───────────────────────────────────────
if echo "$P" | grep -qE "workflow|state machine|status|approval|transition|state|leave request|flow|approve|reject|cancel"; then
  AGENTS+=("agent-logic-analyzer")
  SKILLS+=("skill-state-machine-patterns.md")
  RULES+=("rule-state-machines.md")
fi

# ─ Audit / Code review ────────────────────────────────────────────────────────
if echo "$P" | grep -qE "review|audit|check|is this correct|is this right|validate|verify|look at|inspect"; then
  AGENTS+=("agent-code-review")
  RULES+=("rule-audit-standards.md")
fi

# ─ Memory / Session ───────────────────────────────────────────────────────────
if echo "$P" | grep -qE "/start|/done|memory|session|context|handoff|compact|project state"; then
  AGENTS+=("agent-memory")
fi

# ─ Socket / Realtime / Notifications ─────────────────────────────────────────
if echo "$P" | grep -qE "socket|realtime|real.time|websocket|emit|broadcast|notification|bell|unread|live update|push notification"; then
  AGENTS+=("agent-frontend-wiring")
  SKILLS+=("skill-socket-patterns.md" "skill-notification-patterns.md")
fi

# ─ File upload / Export / Import / Bulk ──────────────────────────────────────
if echo "$P" | grep -qE "upload|file upload|image upload|csv|import|export|pdf|excel|report|download|bulk|batch|mass update"; then
  AGENTS+=("agent-planner")
  SKILLS+=("skill-file-upload-patterns.md" "skill-report-export-patterns.md" "skill-bulk-operations-patterns.md")
fi

# ─ Observability / Logging / Health ──────────────────────────────────────────
if echo "$P" | grep -qE "log|logging|monitor|observability|health check|sentry|alert|trace|winston|audit log|error tracking"; then
  AGENTS+=("agent-observability")
  SKILLS+=("skill-monitoring-patterns.md" "skill-audit-log-patterns.md")
fi

# ─ Charts / Dashboard / Analytics ────────────────────────────────────────────
if echo "$P" | grep -qE "chart|graph|dashboard|kpi|stats|analytics|recharts|bar chart|line chart|donut|pie chart|metric"; then
  AGENTS+=("agent-ui-ux")
  SKILLS+=("skill-chart-patterns.md")
fi

# ─ Webhooks / Integrations ────────────────────────────────────────────────────
if echo "$P" | grep -qE "webhook|hmac|outgoing|incoming webhook|integration|third.party|stripe|github webhook|payload"; then
  AGENTS+=("agent-api-security")
  SKILLS+=("skill-webhook-patterns.md")
fi

# ─ PWA / Offline / Service Worker ─────────────────────────────────────────────
if echo "$P" | grep -qE "pwa|service worker|workbox|offline|install prompt|manifest|web app|installable"; then
  AGENTS+=("agent-ui-ux")
  SKILLS+=("skill-pwa-patterns.md")
fi

# ─ Electron / Desktop app ─────────────────────────────────────────────────────
if echo "$P" | grep -qE "electron|desktop app|tray|windows app|ipc|auto.update|nsis|installer|exe"; then
  AGENTS+=("agent-devops")
  SKILLS+=("skill-electron-patterns.md")
fi

# ─ i18n / Localisation ────────────────────────────────────────────────────────
if echo "$P" | grep -qE "i18n|locale|translation|language|hindi|arabic|rtl|multilingual|internation|localiz"; then
  AGENTS+=("agent-ui-ux")
  SKILLS+=("skill-i18n-patterns.md")
fi

# ─ Multi-tenancy / Organizations / Plans ─────────────────────────────────────
if echo "$P" | grep -qE "multi.tenant|multitenant|subdomain|organization|tenant|saas plan|subscription|onboard"; then
  AGENTS+=("agent-planner")
  SKILLS+=("skill-multitenancy-patterns.md")
  RULES+=("rule-security-rbac.md")
fi

# ─ Infinite scroll / Virtual list / Cursor pagination ────────────────────────
if echo "$P" | grep -qE "infinite scroll|virtual list|cursor pagination|load more|intersection observer|scroll"; then
  AGENTS+=("agent-performance")
  SKILLS+=("skill-infinite-scroll-patterns.md")
fi

# ─ Capacitor / Mobile App ─────────────────────────────────────────────────────
if echo "$P" | grep -qE "capacitor|android|ios|mobile app|apk|ipa|fcm|deep link|safe area|native"; then
  AGENTS+=("agent-devops")
  SKILLS+=("skill-capacitor-patterns.md")
fi

# ─ Rate limiting ──────────────────────────────────────────────────────────────
if echo "$P" | grep -qE "rate limit|rate.limit|throttle|too many requests|429|brute force"; then
  AGENTS+=("agent-api-security")
  SKILLS+=("skill-auth-patterns.md")
  RULES+=("rule-api.md")
fi

# ─ Domain modeling / DDD / Aggregates ────────────────────────────────────────
if echo "$P" | grep -qE "domain|aggregate|value object|bounded context|ddd|entity|invariant|ubiquitous language|anti.corruption|domain event|repository pattern"; then
  AGENTS+=("agent-logic-creator")
  SKILLS+=("skill-domain-modeling-patterns.md" "skill-business-rules-patterns.md")
  RULES+=("rule-mvc-architecture.md")
fi

# ─ Business rules / Specifications / Policies ────────────────────────────────
if echo "$P" | grep -qE "business rule|specification|policy|rule table|validation rule|guard|precondition|eligibility|can.*apply|can.*approve"; then
  AGENTS+=("agent-logic-creator")
  SKILLS+=("skill-business-rules-patterns.md" "skill-state-machine-patterns.md")
fi

# ─ Saga / Orchestration / Outbox / Process manager ───────────────────────────
if echo "$P" | grep -qE "saga|orchestration|choreography|outbox|process manager|compensation|rollback step|idempotency|durable|long.running|multi.step"; then
  AGENTS+=("agent-logic-creator" "agent-logic-analyzer")
  SKILLS+=("skill-workflow-orchestration-patterns.md" "skill-state-machine-patterns.md")
  RULES+=("rule-state-machines.md")
fi

# ─ Keyboard shortcuts / Hotkeys / Command palette ────────────────────────────
if echo "$P" | grep -qE "keyboard|shortcut|hotkey|command palette|ctrl\+k|cmd\+k|focus trap|accessibility|a11y|tab order|arrow key|escape key"; then
  AGENTS+=("agent-ui-ux")
  SKILLS+=("skill-keyboard-shortcuts-patterns.md" "skill-ui-ux-checklist.md")
  RULES+=("rule-frontend.md")
fi

# ─ Result type / Circuit breaker / Retry ─────────────────────────────────────
if echo "$P" | grep -qE "result type|circuit breaker|retry|backoff|dead.letter|jitter|fallback|resilience"; then
  AGENTS+=("agent-logic-creator" "agent-debugger")
  SKILLS+=("skill-error-handling-patterns.md" "skill-background-jobs-patterns.md")
fi

# ── Output dispatch context ───────────────────────────────────────────────────
# No keywords matched — rules are already in CLAUDE.md system context, no extra output needed
if [ ${#AGENTS[@]} -eq 0 ]; then
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
echo "Apply these agents and patterns to the current task."

exit 0
