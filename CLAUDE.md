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

Stage 0 (bootstrap), G1A (YouTube channel resolution: `lib/youtube/*`), and G1B
(Channel Analyzer end-to-end: uploads playlist + videos.list + median/outlier
report, `POST /api/analyzer`, `/analyzer` page) are complete. All API access
goes through `lib/youtube/request.ts` (server-only, API key via
`x-goog-api-key` header, never in the URL). No database is used yet — G1B
computes everything per-request from live YouTube data.

Not yet implemented: Supabase, database connection, authentication, dashboard,
watchlist, opportunity finder, idea generator, AI API, caching, rate limiting,
deployment. Do not start any of these until a later stage is explicitly
approved.
