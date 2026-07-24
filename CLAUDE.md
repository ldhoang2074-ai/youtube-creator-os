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

UI-3A redesigned the Analyzer page frame, input and result states, and channel
summary using the existing semantic dark tokens.

UI-3B redesigned the Analyzer video results, outlier badges, video-detail
content, and the shared DetailDialog visual shell using existing semantic
tokens while preserving all data, interaction, accessibility, and
dialog-focus behavior.

UI-3C redesigned the `/compare` page frame, form, and loading and error
states, and replaced the fixed-width horizontal comparison table with
responsive channel cards using the existing shared `Grid` component and
semantic dark UI tokens, preserving the existing `POST /api/compare` request,
validation, result ordering, data contract, accessibility roles, and
business behavior.

UX-1 — Persistent input drafts — auto-saves the raw text typed into the
Analyzer, Compare, Opportunity Feed, and Transcript input fields to
`localStorage` via a shared `usePersistentDraft` hook
(`lib/drafts/use-persistent-draft.ts` and `lib/drafts/storage.ts`),
namespaced per page under
`youtube-creator-os:draft:{analyzer,compare,opportunities,transcript}:v1`,
and restores the draft when the page is revisited or reloaded. Clearing a
field removes its stored key. On the Opportunity Feed page, `initialInputs`
passed in from the query string or Workspace takes priority over any stored
draft and becomes the new draft. `localStorage` is only ever accessed on the
client: the stored draft is read through `useSyncExternalStore` with an
SSR/hydration-safe server snapshot, while writing or clearing the stored
draft happens inside a `useEffect`. Storage errors are handled so the input
experience keeps working regardless of storage availability. UX-1 does not
submit forms, call any API, or persist analysis/transcript results — only
the raw input text. UX-1 is complete and merged.

UI-3D — Opportunity Feed visual redesign — applies the existing dark
semantic design system to the `/opportunities` page frame, input form,
loading/error/empty states, `ChannelCard`, and the Opportunity Feed results
(renamed visually from a fixed-width horizontal `<table>` to a responsive
`Grid` of cards, still exported as `OpportunityFeedTable` to avoid breaking
its contract), plus `ChannelDetailDialog` (touched beyond the originally
listed files because it is the only remaining zinc-styled screen reachable
from this page — it is `ChannelCard`'s own detail view and is used nowhere
outside Opportunity Feed). The 2× threshold explanation on the page frame
was reworded for clarity and to state explicitly that it is a snapshot of
the analyzed set, not a measure of change over time, without altering its
meaning. UI-3D preserves the existing `POST /api/opportunities` request,
2-5 channel validation, runtime response validation, `successfulInputs`
closure behavior, item ordering, `showThumbnails`/`onViewDetails` props,
outlier labels and multiplier formatting, the UX-1 persistent draft wiring
(including `initialInputs` priority), `SaveResearchButton`,
`TitlePatternPanel`, both detail dialogs, Workspace behavior, and all
accessibility roles and dialog-focus behavior. It does not add sorting,
filtering, search, or pagination, and does not change the outlier algorithm,
the 2× threshold, or any type/domain model. UI-3D is complete and merged.

UI-3E — Workspace visual redesign — applies the existing dark semantic
design system to the `/workspace` page frame (`max-w-[1600px]`, matching the
other redesigned product pages), the "saved on this device only"
explanation panel, the loading/storage-unavailable/skipped/empty states,
each saved-session card, the two-step delete confirmation, the expanded
snapshot content wrappers, and `WorkspaceVideoCard`'s own "View details"
action. Saved-session cards gained `aria-expanded`/`aria-controls` on the
session-name toggle and a semantic border/surface treatment while expanded;
these are additive accessibility attributes and a visual state only, not
new behavior. UI-3E preserves `useSyncExternalStore`, its stable
`SERVER_SNAPSHOT` and `STORAGE_UNAVAILABLE_SNAPSHOT` references,
`WORKSPACE_STORAGE_KEY`, the cross-tab `storage` event subscription, the
same-tab `refreshSnapshot` pattern,
`handleSelect`/`handleRequestDelete`/`handleConfirmDelete`/
`handleCancelDelete` and their exact storage/error-mapping behavior,
selected-session and selected-video state, `sessions.map(...)` and saved
item ordering (no sorting, filtering, grouping, search, or pagination),
`buildOpportunitiesHref`'s repeated `channel` query parameters,
`prefetch={false}` on the Opportunity Feed link, `analyzeTitlePatterns`,
`TitlePatternPanel`, `VideoDetailDialog`, and all current data/domain types
and storage functions in `lib/workspace/*`. It does not restyle
`VideoCardBase`, `TitlePatternPanel`, or `VideoDetailDialog` themselves, and
does not add a database, authentication, cloud sync, API calls, autosave,
or new dependencies. UI-3E is complete and merged.

UI-3F — Transcript visual redesign — applies the existing dark semantic
design system to the `/transcript` page frame (`max-w-[1600px]`), the
transcript request form, the loading/error/empty (transcript-not-found /
transcript-unavailable) states, the successful result container and its
download-action layout, `TranscriptSegmentList` (heading, Language/
Generation metadata rendered as semantic pill badges, and each segment row
with a semantic timestamp pill and hover state), and
`TranscriptDownloadButton`'s visible button styling only. UI-3F preserves
`DRAFT_STORAGE_KEY` and `usePersistentDraft(DRAFT_STORAGE_KEY)`, all
`Status` values and state variables, the runtime response validators
(`isTranscriptDocument`/`isTranscriptSuccessBody`/`getSafeApiError`), the
`handleSubmit` duplicate-submit guard, `input.trim()` and empty-input
validation, the `POST /api/transcript` request (method, `content-type`,
`body: JSON.stringify({ input: trimmedInput })`), every existing error and
empty-state message, the `TRANSCRIPT_NOT_FOUND`/`TRANSCRIPT_UNAVAILABLE`
mappings, all state transitions, `errorRef`/`emptyRef`/`resultRef` and their
`useEffect` focus management, `role="status"`/`role="alert"`/
`aria-live="polite"`/`role="region"`/`aria-label="Transcript result"`/
`tabIndex={-1}`, `transcript.segments.map(...)` source order (no sorting,
filtering, grouping, deduplication, merging, or pagination of segments),
`formatTranscriptTimestamp`, the exact "Manual"/"Auto-generated"/"Unknown"
generation labels, `whitespace-pre-wrap`/`min-w-0`/`break-words` text
protections, and `TranscriptDownloadButton`'s `handleDownload` behavior
(UTF-8 BOM, Blob type, object URL creation/revocation, temporary anchor
append/click/remove, generated filename). It does not add a language or
provider selector, database, authentication, cloud sync, new API requests,
autosave beyond the existing draft hook, sorting, filtering, search,
pagination, transcript editing, or transcript summarization. UI-3F is
complete and merged.

The current implementation stage is UI-3G — Global surfaces visual
redesign. UI-3G applies the existing dark semantic design system to the
three remaining global application surfaces: the home/entry screen
(`app/page.tsx`), the route-level loading fallback (`app/loading.tsx`), and
the route-level error boundary (`app/error.tsx`). The home screen now uses
`bg-ui-bg`, `text-ui-text`/`text-ui-text-secondary`, and a `bg-ui-accent`
pill CTA with `focus-visible:ring-ui-focus`, in place of `zinc-*`, `dark:*`,
`bg-foreground`/`text-background`, and the hardcoded `#383838`/`#ccc` hover
colors. The loading fallback keeps its plain semantic text but gains an
optional CSS-only spinner (`animate-spin`, no dependency, no client-side
state). The error boundary is now a `rounded-ui-panel` danger surface
(`border-ui-danger/40 bg-ui-danger/10`) with a `bg-ui-accent` primary retry
button. UI-3G preserves, verbatim: on the home page, the "YouTube Creator
OS" heading, the existing description text, the "Get Started" CTA text, and
`href="/analyzer"`; on the loading fallback, `role="status"`,
`aria-live="polite"`, and the exact "Loading page..." text; on the error
boundary, `"use client"`, the `ErrorPageProps` contract
(`error: Error & { digest?: string }`, `unstable_retry: () => void`), the
`unstable_retry` callback (not renamed), `type="button"`,
`onClick={unstable_retry}`, and the exact "Something went wrong" / "We
could not load this page. Please try again." / "Try again" copy. UI-3G does
not add API calls, client state, timers, effects, new dependencies, new
navigation, logging/telemetry, or any new product behavior on any of the
three surfaces, and does not modify `TitlePatternPanel`, `SaveResearchButton`,
shared design tokens, API routes, domain logic, or storage logic. It is
implemented on this branch and remains limited to the reviewed UI-3G scope;
it has not been merged.
