@AGENTS.md

# Project rules

- Always survey the repository before making changes.
- Always write a short plan before starting a large task.
- Only touch files that are in scope for the current task.
- Do not expand product scope without explicit approval.
- Do not change the framework or package manager without explicit approval.
- Do not add a dependency without explaining why it is needed.
- Do not use `any` or `@ts-ignore` to silence errors.
- Do not commit, push, rebase, reset --hard, or force push.
- Do not read, print, or commit secrets.
- Do not put API keys in client-side code.
- Do not run `rm -rf` or other destructive commands.
- Do not deploy unless explicitly asked.
- Must run lint, typecheck, test, and build before reporting a task as complete.
- Do not report a task as complete while any of those commands are failing.
- YouTube API and Supabase integration are only implemented in their own approved stages.

## Current stage

Stage 0 (bootstrap) is complete: Next.js App Router, TypeScript strict, Tailwind
CSS, ESLint, Vitest, a minimal landing page, and one real business-logic module
(`lib/analysis/median.ts`) with real tests.

Not yet implemented: Supabase, database connection, YouTube API, authentication,
dashboard, analyzer, watchlist, API routes, deployment. Do not start any of these
until a later stage is explicitly approved.
