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
G1E (Research Workspace: client-only `localStorage` persistence of
manually saved Opportunity Feed snapshots, `/workspace` page, no server
endpoint of its own), and G1F (Deterministic Title Pattern Finder:
`lib/title-patterns/*`, `components/title-patterns/TitlePatternPanel.tsx`,
detects repeated words/bigrams/openings/endings/numbers/question-marks in
the titles of an already-computed Opportunity Feed result, shown on both
the live `/opportunities` result and saved `/workspace` snapshots, no new
API endpoint, no AI, no additional YouTube API request) are complete. G2A
(provider-agnostic Transcript Domain Model: immutable normalized transcript
documents and pure helpers in `lib/transcript/*`, no transcript provider,
fetching, chunking, API route, or AI) is complete. G2B (YouTube URL & Video ID
Parser: pure URL/reference parsing in `lib/youtube/video-id-parser.ts`, no
network call, video existence check, API route, or transcript provider) is
complete. G2C (Transcript Intelligence MVP: accepts YouTube URLs and raw
11-character video IDs, uses a server-only Supadata transcript provider,
normalizes transcript domain documents, provides `POST /api/transcript` and
the `/transcript` page, renders timestamped transcript segments, and downloads
UTF-8 BOM TXT files containing timestamped segment lines only) is complete and
merged. G2C does not include AI analysis or summarization, a database,
authentication, persistence, or a transcript language selector. YouTube Data API access goes through `lib/youtube/request.ts`; the YouTube API
key remains server-only and is sent through the `x-goog-api-key` header, never
in the URL. Supadata transcript access goes through the server-only transcript
provider, and Supadata credentials are never exposed to client code. No database
is used. Analyzer, Compare, and Opportunity results are computed per request.
Workspace snapshots remain client-only `localStorage`, while transcript results
remain page-memory only and are not persisted. `POST /api/opportunities` is only
ever called when the user explicitly runs or re-runs an analysis (from
`/opportunities` directly, or via "Open these channels in Opportunity Feed"
from `/workspace` followed by the user clicking "Find opportunities"
themselves) — never automatically.

Not yet implemented: transcript chunking, transcript AI analysis or
summarization, transcript language selector, Supabase/database integration,
authentication, cloud persistence/sync, ongoing watchlist tracking, time-series
growth tracking, Content Gap engine, Idea Generator, AI API, caching, rate
limiting, deployment, and a Chrome extension. Do not start any of these until a
later stage is explicitly approved.

UI1 (Product Shell & Navigation: shared responsive product shell, deterministic
navigation metadata, and no feature business-logic changes) and its
mobile-navigation hotfix are merged. The UI2 readiness audit is merged. The
UI2 Stage 0 foundations, UI2 Stage 1 Analyzer video grid, UI2 Stage 2
Workspace video grid, and UI2 Stage 3 Opportunities channel grid are merged.
UI-1A shell-only internationalization contracts and UI-1B semantic design
tokens are complete and merged. English and Vietnamese contracts exist, Spanish
is reserved for a later stage, and the dictionaries are not connected to product
pages. UI-1B defines color, spacing, radius, and typography tokens with Tailwind
theme aliases for future work only; no token is consumed by the shell yet.

UI-2A localized and decomposed AppShell: the root Server Component passes
default English shell messages to AppShell, navigation structure no longer stores
user-facing English copy, and Brand, ProductHeader, and ProductNavigation are
separated from AppShell. Drawer ownership and focus behavior remain in AppShell.

The current implementation stage is UI-2B — visible dark AppShell redesign.
UI-2B applies the semantic tokens to the product shell: the desktop sidebar,
mobile drawer, brand, header, navigation, and content frame now use the dark
visual system. The visible redesign is limited to AppShell; product pages are
not redesigned yet, and the landing page remains unchanged. Navigation icons are
local inline SVGs, with no external icon dependency added. Existing drawer and
accessibility behavior remains. No authentication, login UI, user, account,
credits, or notification controls exist. No runtime locale switching, locale
cookie, locale persistence, route group, or route change exists. The next UI
stage redesigns core product pages.

The current implementation stage is UI-3A — Analyzer visual redesign. UI-3A
redesigns only the Analyzer page frame, input and result states, and channel
summary using the existing semantic dark tokens. It is implemented on this branch and
remains limited to the reviewed UI-3A scope.
