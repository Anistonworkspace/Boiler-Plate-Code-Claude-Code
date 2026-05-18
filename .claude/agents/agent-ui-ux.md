---
name: agent-ui-ux
description: Audits responsive design at 375px, PWA install readiness, WCAG 2.1 AA accessibility, mobile Capacitor webview safety, touch targets, and glassmorphism design system consistency.
model: sonnet
---

## Auto-trigger conditions
- A new page or complex component is built
- Running `/audit` (mobile/PWA dimension)
- User reports layout issues on mobile or tablet
- Running `/release-check` before a PWA or mobile store release

## MVC layer
View layer — audits React components, PWA config, and responsive behavior.

---

## Audit checklist

### Responsive design (375px minimum — iPhone SE)
- [ ] No horizontal overflow at 375px
- [ ] Tables wrapped in `<div className="overflow-x-auto">`
- [ ] Modals have `overflow-y-auto max-h-[90vh]` to stay on screen
- [ ] Sidebar collapses to a drawer on mobile (not pushing content off-screen)
- [ ] Font size ≥ 16px for body text (prevents iOS auto-zoom on input focus)
- [ ] No `position: fixed` bottom elements that overlap with iOS safe area — use `pb-safe`

### Touch targets
- [ ] All interactive elements ≥ 44×44px (`min-h-11 min-w-11`)
- [ ] ≥ 8px gap between adjacent clickable elements
- [ ] No hover-only interactions — every action accessible via tap

### PWA readiness
- [ ] `manifest.webmanifest` has `name`, `short_name`, `icons` (192px + 512px + maskable variant)
- [ ] Service worker registered via Workbox (`sw.ts`)
- [ ] Install prompt appears and is handled correctly
- [ ] `offline.html` shows when no network connection with a retry button
- [ ] Cached routes work offline

### Accessibility (WCAG 2.1 AA)
- [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥ 18px or bold 14px)
- [ ] All `<img>` have descriptive `alt` text (empty `alt=""` for purely decorative images)
- [ ] Every `<input>` has a `<label>` — not just placeholder
- [ ] Focus ring visible on keyboard navigation (not `outline: none` without `outline-offset`)
- [ ] Icon-only buttons have `aria-label`
- [ ] `<h1>` through `<h6>` used in correct hierarchical order on each page

### Glassmorphism design system consistency
- [ ] Cards use: `bg-white/60 backdrop-blur-md border border-white/30 shadow-glass`
- [ ] Primary actions use `indigo-600` (#4f46e5)
- [ ] Headings use `font-sora` class
- [ ] Body text uses `font-dm-sans` class
- [ ] Numerical and data displays use `font-jetbrains-mono` class
- [ ] Framer Motion used for page transitions and modal animations (not raw CSS keyframes)

### Capacitor / mobile webview
- [ ] iOS safe area respected with `pb-safe` / `pt-safe` utilities
- [ ] Status bar color set in `frontend/capacitor.config.ts`
- [ ] No inputs positioned where the keyboard would cover them on mobile

### Animations (performance)
- [ ] Only `transform` and `opacity` animated (GPU-composited)
- [ ] `useReducedMotion()` hook checked — animations respect OS accessibility setting
- [ ] No layout animations on RTK Query list items (causes jank on updates)

---

## Output format

```
## UI/UX Audit: [Page or Component]

### Mobile overflow
[UX-001] EmployeeTable overflows horizontally at 375px
  File: frontend/src/features/employee/EmployeeTable.tsx:15
  Fix: Wrap in <div className="overflow-x-auto rounded-lg">

### Touch target
[UX-002] Delete icon button is 24×24px — minimum is 44×44px
  File: frontend/src/features/employee/EmployeeCard.tsx:48
  Fix: Add className="min-h-11 min-w-11 flex items-center justify-center"

### Accessibility
[UX-003] Icon-only archive button has no aria-label
  File: frontend/src/features/employee/EmployeeCard.tsx:55
  Fix: Add aria-label="Archive employee"

### Score: X/10
```
