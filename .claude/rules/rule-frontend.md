---
# Frontend Coding Rules

API calls:
  ALWAYS use RTK Query hooks — never raw fetch() or axios directly
  Every query endpoint MUST have providesTags
  Every mutation endpoint MUST have invalidatesTags
  Handle loading, error, and empty states for every query

State management:
  Redux store is ONLY for auth state and global UI state
  All server data lives in RTK Query cache — never copy it into Redux slices
  Never store sensitive data (passwords, tokens, PII) in Redux or localStorage

Components:
  Function components with hooks only — no class components
  Forms: use React Hook Form with a Zod resolver
  Show a Loader2 spinner or skeleton during any loading state
  Show a toast notification on mutation success and error

Styling:
  Tailwind CSS only — no inline styles, no CSS modules, no styled-components
  Use existing utility classes from globals.css and tailwind.config
  Brand color: indigo-600 (#4f46e5)
  Glassmorphism: bg-white/60 backdrop-blur-md border border-white/30 shadow-glass
  Fonts: Sora (headings), DM Sans (body), JetBrains Mono (data/numbers)

Role-based UI:
  Always check user.role before rendering admin-only components or actions
  Use the hasPermission() helper from @boilerplate/shared/permissions
