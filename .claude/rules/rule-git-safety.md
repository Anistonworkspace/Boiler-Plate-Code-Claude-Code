---
# Git Safety Rules

Pushing code:
  NEVER push code, create PRs, or trigger deployments without explicit user approval
  NEVER force-push to main or master under any circumstances
  Before any push: show the exact diff, confirm the branch, warn if pushing to main
  Get an explicit "yes" from the user before pushing

Safe git operations (pre-approved, no confirmation needed):
  git status, git diff, git log, git branch, git show

Worktrees:
  NEVER use isolation: "worktree" in this project
  NEVER run git worktree add
  All changes from ALL agents MUST be made directly in the main working tree
  This ensures all changes appear in VS Code Source Control as a single unified diff

If you find yourself in a worktree path:
  Stop immediately
  Redo the work in the main working directory
