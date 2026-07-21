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

Stage 0 (bootstrap), G1A (YouTube channel resolution: `lib/youtube/*`), G1B
(Channel Analyzer: uploads playlist + videos.list + median/outlier report,
`POST /api/analyzer`, `/analyzer` page), G1C (Channel Compare: analyzes 2-5
channels independently via `Promise.allSettled`, `POST /api/compare`,
`/compare` page), G1D (Opportunity Feed: pools videos at >=2x each channel's
own median from 2-5 channels via `compareChannels`, deduplicated by videoId,
deterministically sorted, `POST /api/opportunities`, `/opportunities` page),
and G1E (Research Workspace: client-only `localStorage` persistence of
manually saved Opportunity Feed snapshots, `/workspace` page, no server
endpoint of its own) are complete. All API access goes through
`lib/youtube/request.ts` (server-only, API key via `x-goog-api-key` header,
never in the URL). No database is used yet — everything is computed
per-request from live YouTube data. `POST /api/opportunities` is only ever
called when the user explicitly runs or re-runs an analysis (from
`/opportunities` directly, or via "Open these channels in Opportunity Feed"
from `/workspace` followed by the user clicking "Find opportunities"
themselves) — never automatically.

Not yet implemented: Supabase, database connection, authentication, dashboard,
watchlist (ongoing tracking), cloud sync, time-series/growth tracking, idea
generator, AI API, caching, rate limiting, deployment. Do not start any of
these until a later stage is explicitly approved.
