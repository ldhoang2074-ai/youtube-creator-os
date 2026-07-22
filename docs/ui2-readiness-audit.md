# UI2 Readiness Audit — YouTube Creator OS

**Audited by:** Technical Lead review (Claude)
**Audit date:** 2026-07-23
**Repository:** `D:\youtube-creator-os`
**Branch audited from:** `feature/ui2-readiness-audit` (branched from `main` at `3c35bfd`, working tree clean, no divergence from `origin/main` at audit time)
**Latest main merge commit:** `3c35bfd` — "Merge pull request #13 from ldhoang2074-ai/hotfix/ui1-mobile-nav-close"
**Method:** Every file referenced below was read directly. No conclusion in this document is based on README/CLAUDE.md/comments alone — where documentation was checked, any drift from actual code is called out explicitly. No application code, dependencies, or manifests were modified during this audit.

---

## A. Executive Summary

The product today is a **single-session, request-scoped YouTube research tool**: four working feature pages (Channel Analyzer, Channel Compare, Opportunity Feed, Research Workspace) built on a small, well-tested, dependency-free domain layer (`lib/channel-analyzer`, `lib/analysis`, `lib/title-patterns`, `lib/workspace`, `lib/youtube`). All financial/engagement numbers shown to users are **real, live-fetched YouTube Data API v3 values** — nothing is mocked, seeded, or fabricated anywhere in the production code path. UI1 (the shared product shell and responsive navigation) is merged and, after four rounds of real-browser-verified hotfixes, is now in a solid state: mobile drawer focus management, `aria-hidden` background containment, and synchronous close-before-navigate are all correct as read from the current source.

UI2 (channel/video **grid** presentations) is **not implemented at all** — zero grid or card components exist anywhere in the repository; every current result view is a plain HTML `<table>`. There is also **no in-app detail view of any kind**: the only per-video interaction that exists today is an external `target="_blank"` link straight to `youtube.com/watch`. "Similar channels" has **zero backing data or algorithm** — it does not exist as a concept anywhere in the domain layer, and the only YouTube endpoint that could plausibly power it, `search.list`, is a keyword/topic search endpoint, not a similarity engine. It costs 1 unit/call — the same as every endpoint already used here — but draws from YouTube's separate **Search Queries** quota bucket, which defaults to only **100 calls/day**, a small independent daily ceiling rather than a per-call cost multiplier. Building this feature would still require a query strategy, ranking approach, caching plan, and evaluation method that do not exist today, or an entirely new similarity computation that has not been designed.

The repository is in a **workable but not fully clean** starting position for UI2: three duplicated helper functions (`isApiErrorBody`, `formatDuration`, `buildYoutubeWatchUrl`), zero component-level or browser-level test coverage (only pure-function unit tests + three API-route integration tests), zero Next.js `loading.tsx`/`error.tsx` boundaries anywhere, a landing-page button with no click handler, two fully-built-but-completely-unwired domain modules (`lib/transcript/*`, `lib/youtube/video-id-parser.ts`), and one dead class (`QuotaTracker`, tested but never called from the real request path). None of these are blocking in the sense of broken functionality — `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` all pass cleanly today (see §6 and the Verification Log) — but several are worth fixing in small, targeted PRs before or alongside the first UI2 stage, because UI2's stated screens (grids) will multiply exactly the kind of per-item rendering code that is already duplicated three times.

**Recommendation:** proceed with UI2 in small stages, starting with a cleanup-and-foundations PR (§H) that removes duplication, adds route-level `loading.tsx`/`error.tsx` resilience boundaries, and makes a small number of deliberate, low-risk, intentional UX fixes (landing CTA, channel thumbnail quality) — before any grid UI is written.

---

## B. Repository Reality Map

### B.1 Route inventory (real, from `app/` directory structure and `next build` output)

| Route | Type | Implementation status | Notes |
|---|---|---|---|
| `/` | Page (Server Component) | **Partial / has a dead control** | Static landing page. `app/page.tsx` renders a `<button>` labeled "Get Started" with **no `onClick`, no `href`, no `<Link>` wrapper** — it does nothing when clicked. Not wrapped by the product shell (`isProductRoute("/")` is `false` by design). |
| `/analyzer` | Page (Server Component) + Client feature | **Complete** | Form → `POST /api/analyzer` → `ChannelSummary` + `VideoResultsTable`. Idle/loading/success/error states all present. |
| `/compare` | Page (Server Component) + Client feature | **Complete** | Textarea (2–5 channels) → `POST /api/compare` → `ComparisonTable`. Same state machine pattern as analyzer. |
| `/opportunities` | Page (async Server Component) + Client feature | **Complete** | Reads `?channel=` query params server-side via `parseChannelQuery`, prefills the form. → `POST /api/opportunities` → `OpportunityFeedTable` + `TitlePatternPanel` + `SaveResearchButton`. |
| `/workspace` | Page (Server Component) + Client feature | **Complete, client-only persistence** | `localStorage`-only, no server endpoint of its own. List/select/delete saved sessions; each saved session embeds a frozen `OpportunityFeedTable` (thumbnails off) + `TitlePatternPanel`. Uses `useSyncExternalStore` correctly with a stable server snapshot to avoid hydration mismatch. |
| `POST /api/analyzer` | Route handler | **Complete** | zod-validated body, maps every `YoutubeErrorCode` to an HTTP status, never leaks internal error messages for unknown errors. |
| `POST /api/compare` | Route handler | **Complete** | zod-validated 2–5 inputs, trims, rejects empty/duplicate inputs before calling the domain layer. |
| `POST /api/opportunities` | Route handler | **Complete** | Same validation as compare, then `buildOpportunityFeed(compareChannels(...))`. |

No other routes exist. `next build` confirms this exact set (plus the framework's own `/_not-found`).

### B.2 Embedded / non-route features

- **Title Patterns** — not a route. `analyzeTitlePatterns()` runs client-side over an already-fetched `OpportunityFeedResult` and renders inline on both `/opportunities` and `/workspace`. Correctly marked `status: "embedded"` in the nav model, not a link.

### B.3 Dead or unwired code (confirmed by `grep`, not by reading a comment)

| Item | File(s) | Status |
|---|---|---|
| `QuotaTracker` class | `lib/youtube/quota.ts` | Fully implemented and unit-tested, but **never instantiated anywhere in `lib/youtube/request.ts` or any caller** — no quota accounting actually happens on the live request path today. |
| Transcript domain model (G2A) | `lib/transcript/types.ts`, `lib/transcript/domain.ts` | Fully implemented, immutable, well-tested pure module. **Zero imports from anywhere in `app/` or `components/`.** No transcript provider/fetcher exists. |
| YouTube video ID/URL parser (G2B) | `lib/youtube/video-id-parser.ts` | Fully implemented, well-tested pure module. **Zero imports from anywhere in `app/` or `components/`.** |
| Landing page "Get Started" button | `app/page.tsx` | Renders, has no behavior. |

These three unwired modules are **capability, not liability** — they are correctly-scoped, already-reviewed building blocks for future stages (transcript UI, video-URL-based entry points) but must not be assumed "available" for UI2 without an explicit wiring task.

### B.4 Architecture

```
app/                     — routes only (Server Components + one async Server Component)
components/
  app-shell/              — AppShell, navigation.ts (shared shell, hardened over 4 hotfix rounds)
  channel-analyzer/        — ChannelAnalyzerClient, ChannelSummary, OutlierBadge, VideoResultsTable
  channel-compare/         — ChannelCompareClient, ComparisonTable
  opportunity-feed/        — OpportunityFeedClient, OpportunityFeedTable
  title-patterns/          — TitlePatternPanel (reused by opportunities + workspace)
  workspace/                — WorkspaceClient, SaveResearchButton
lib/
  youtube/                 — request.ts (single fetch chokepoint), client.ts, resolve-channel.ts,
                              playlist-items.ts, videos.ts, schemas.ts (zod), errors.ts, quota.ts (unused),
                              parse-channel-input.ts, parse-safe-count.ts, duration.ts, thumbnail.ts,
                              video-id-parser.ts (unused)
  channel-analyzer/         — analyze-channel.ts, compare-channels.ts, build-opportunity-feed.ts,
                              outlier-rate.ts, types.ts  (the core domain layer)
  analysis/                 — median.ts, outlier.ts (pure math, zero YouTube coupling)
  title-patterns/           — analyze-title-patterns.ts, tokenize.ts, stopwords.ts, types.ts
  workspace/                 — storage.ts, guards.ts, types.ts (localStorage, fully guarded/validated)
  transcript/                — types.ts, domain.ts (unwired, see B.3)
tests/
  unit/  (23 files)          — pure-function coverage of nearly every lib module
  integration/ (3 files)     — API route handlers only
```

**Client/Server boundary discipline:** correct throughout. Every `page.tsx` is a Server Component (one is `async` for `searchParams`). Every interactive feature is isolated into its own `"use client"` component, imported once from its page. `AppShell` is the only client component in the layout tree; the root `app/layout.tsx` itself has zero `"use client"`. This pattern is consistent and should be followed for UI2.

**State management:** no external state library (no Redux/Zustand/Jotai/TanStack Query — none in `package.json`). Each client component owns local `useState` for its own request lifecycle (`idle|loading|success|error`). `WorkspaceClient` is the one exception, using `useSyncExternalStore` to read `localStorage` safely across tabs. This is adequate for today's page-scoped, non-shared data, but **UI2 grids that need cross-component selection/filter state (e.g., a channel grid whose selection affects a video grid) will need a decision**: lift state to a shared client component, or introduce a lightweight store. Not yet decided anywhere in the code.

**Data access:** single chokepoint. Every YouTube API call funnels through `youtubeApiGet()` in `lib/youtube/request.ts`, which is the only place the API key is read (`x-goog-api-key` header, never the URL) and the only place responses are zod-validated. This is a strong foundation — any new UI2 data need should extend this file's callers, not bypass it.

### B.5 Reusable UI and domain building blocks already available

- `OutlierBadge` — small, purely presentational, reusable as-is in any future **video** card. Its prop contract is `{ level: OutlierLevel }` — a discrete per-video categorical value (`"insufficient-data" | "normal" | "outlier" | "strong-outlier"`) — not a numeric rate, so it does **not** directly fit a channel-level `outlierRate: number | null` display (see §F.1).
- `lib/analysis/{median,outlier}.ts` — pure math, channel-agnostic, safe to reuse for any new aggregate.
- `lib/channel-analyzer/*` — the entire report/compare/feed pipeline; UI2 grids should **read from these types**, not invent new ones.
- `AppShell` navigation model (`components/app-shell/navigation.ts`) — deterministic, pathname-driven, already supports `"embedded"` and `"coming-soon"` statuses that a new UI2 nav entry can reuse without new abstractions.

---

## C. Blockers Before UI2

None of the items below are `npm test`/`lint`/`typecheck`/`build` failures — all four commands are green today (§ Verification Log). "Blocker" here means one of two things: most items should be fixed **before or as the first PR of** UI2 because UI2 will otherwise inherit or multiply the problem (items #1–4, #6–7); one item (#5, testing coverage) is instead a **consciously accepted, explicitly tracked risk** rather than a hard prerequisite — see the decided policy in §6 and its entry in the Risk Register (§G). `images.remotePatterns` (an earlier draft of this audit listed it here as a Stage-0 blocker) has been removed from this table entirely — see the reclassification below.

| # | Blocker | Evidence | Why it matters for UI2 |
|---|---|---|---|
| 1 | No `loading.tsx` / `error.tsx` anywhere in `app/` | `find app -iname "loading.tsx" -o -iname "error.tsx"` → no results | **Route-level resilience gap, not a fix for existing client-fetch loading states** (see the clarification below) — an unhandled *render* error today (as opposed to a caught `fetch` error, which the existing `idle/loading/success/error` pattern already handles correctly) shows Next's raw dev overlay in development, or a blank/broken screen in production, with no recovery UI. `app/error.tsx` must be a Client Component (`"use client"`) that receives `error`/`reset` (or `unstable_retry`) props and renders an explicit retry action — it is a React error boundary, not a loading indicator. |
| 2 | `isApiErrorBody()` duplicated identically in 3 files | `ChannelAnalyzerClient.tsx`, `ChannelCompareClient.tsx`, `OpportunityFeedClient.tsx` | Every new UI2 client component that calls an API will be tempted to copy a 4th time. |
| 3 | `formatDuration()` duplicated identically in 2 files | `VideoResultsTable.tsx`, `OpportunityFeedTable.tsx` | A video grid card will need the exact same formatting; should be a shared util, not a 3rd copy. |
| 4 | `buildYoutubeWatchUrl()` duplicated identically in 2 files | `OpportunityFeedTable.tsx`, `TitlePatternPanel.tsx` | Same reasoning — a grid card's "open on YouTube" action needs this exact function. |
| 5 | Zero component-level or browser-level tests | `package.json` has no `@testing-library/*`, no `jsdom`, no Playwright/Cypress; `vitest.config.ts` sets `environment: "node"` | **Decided policy (see §6):** an accepted, recorded risk for Stage 1, not a hard blocker — manual QA is the accepted interaction-coverage gate for the first grid PR. Every UI1 shell fix in this project's history required a real browser to actually catch the bug (three separate rounds: focus-steal, aria-hidden, drawer-not-closing), so this risk is real and must not be forgotten, but adding `jsdom`/testing-library is a new-dependency decision this audit does not make unilaterally (Product Principle 3) and is not required to start Stage 1. |
| 6 | Landing page button has no behavior | `app/page.tsx`, `<button>` with no `onClick`/`href` | Cosmetic today; would look worse once UI2 ships if the entry point still does nothing. |
| 7 | `CLAUDE.md` "Current stage" section is stale | Says UI1 is "awaiting final focused technical re-review"; `git log` shows PR #12 and PR #13 both merged into `main` | Not a code risk, but confirms documentation cannot be trusted as a readiness signal — this audit deliberately did not rely on it. |

**Clarification on `loading.tsx` (Blocker #1):** Next.js's `loading.tsx` wraps a route segment in a `<Suspense>` boundary that activates during **server-side navigation/streaming** — it has no effect on a `"use client"` component's own `fetch()` call triggered by a button click after the page has already loaded (e.g. clicking "Analyze channel"). That case is already correctly handled today by each client component's own `idle|loading|success|error` state and must not be re-described as something `loading.tsx` will fix. `loading.tsx`/`error.tsx` close a **different** gap: the between-page navigation experience and unhandled render errors, respectively. Both gaps are real and worth closing, but neither is "the loading UI UI2's data fetches need" — that pattern already exists and new UI2 components should simply reuse it.

**`not-found.tsx` removed from this blocker** (an earlier draft of this audit listed it here, but it was never actually included in the Stage 0 plan below, which is an inconsistency this revision corrects). This repository has no dynamic route segments today (no `[id]`/`[slug]` folders), so Next's default not-found behavior is adequate for the current route set. A custom `not-found.tsx` should only be added if/when UI2 introduces a dynamic route that can 404 on a real ID (e.g. a detail route, F.3) — it is not a gap today.

**`images.remotePatterns` reclassified as a Stage 1 conditional, not a Stage 0 blocker.** An earlier draft of this audit listed `next.config.ts` having no `images.remotePatterns` as an unconditional pre-UI2 fix. That was inconsistent with the rest of this audit: whether it's needed at all depends entirely on a Stage 1 decision (does the new grid adopt `next/image`?) that has not been made. Corrected treatment, now consistent with §9 Stage 1 and the Risk Register (§G):
- **If** Stage 1's `VideoCard`/`ChannelCard` adopt `next/image` for YouTube thumbnails, adding `images.remotePatterns` (for `i.ytimg.com`/`yt3.ggpht.com`) to `next.config.ts` is a **required, in-scope part of Stage 1** — `next/image` will otherwise refuse to render those URLs. `next.config.ts` is added to Stage 1's expected files in that case.
- **Otherwise**, if Stage 1 keeps using raw `<img>` (consistent with every current component — §7), `images.remotePatterns` is not needed at all; the mitigation for the same underlying performance risk (§G) is instead adding explicit `width`/`height` and `loading="lazy"` to the new `<img>` elements, which Stage 1 must do either way if it does not adopt `next/image`.

Blockers #2–4 and #6 are mechanical extractions with no design decision required. Blocker #1 requires understanding the `loading.tsx`/`error.tsx` distinction above but is still a small, well-defined addition. Blocker #5's resolution is a policy decision, made explicitly in §6 (manual QA accepted for Stage 1, tracked as a risk in §G) rather than left unresolved. Blocker #7 is a documentation fix bundled into the Stage 0 PR (§H). `images.remotePatterns` is a Stage 1 conditional per the reclassification above. Recommended sequencing is in §H.

---

## D. Data Capability Matrix

Legend: **Real** = live-fetched from YouTube Data API v3 per request, never cached/mocked. **Calculated** = pure function over already-fetched data, computed client- or server-side, never itself fetched. **Persisted** = written to browser `localStorage` only. **Unavailable** = does not exist anywhere in the current pipeline; would require new backend work, explicitly marked.

### D.1 Channel-level fields (source: `resolveChannel()` → `ChannelAnalysisReport`)

| Field | Status | Notes |
|---|---|---|
| `channelId`, `title` | Real | |
| `thumbnailUrl` | Real, but **only the `default` size** | `resolveChannel.ts` reads `item.snippet.thumbnails?.default?.url` directly — it does **not** call `pickBestThumbnailUrl()` the way video thumbnails do. A UI2 channel grid wanting a larger avatar would render an upscaled/blurry `default`-size image unless this is fixed (small, well-scoped fix — reuse the existing `pickBestThumbnailUrl` helper). |
| `subscriberCount`, `totalViewCount`, `videoCount` | Real | Kept as **strings** deliberately (can exceed `Number.MAX_SAFE_INTEGER`); any UI2 formatting (e.g. "1.2M subscribers") needs a new formatter that operates on the string, not a naive `Number()` cast. |
| `medianViews` | Calculated | `median()` over the channel's own analyzed video view counts; `null` when no valid view counts exist. |
| `analyzedVideoCount` | Calculated | Count of videos actually used in the median (excludes videos with unusable/missing view counts). |
| `outlierRate` (compare only) | Calculated | Only present on `ChannelCompareEntry`, not on a bare `ChannelAnalysisReport`. |
| Channel banner image | **Unavailable** | Never requested; `channels.list` `part=snippet,statistics,contentDetails` does not include `brandingSettings`. Would need a new `part` value and a new field on `ResolvedChannel`. |
| Channel description (long-form) | **Fetched, but does not reach the browser today** | `resolveChannel()` fetches it onto `ResolvedChannel.description` (`item.snippet.description`), but `analyzeChannel()` — the function every endpoint's response is ultimately built from — never copies it: `ChannelAnalysisReport` (`lib/channel-analyzer/types.ts`) has no `description` field, and **neither of `analyze-channel.ts`'s two `return` statements includes it** (verified directly in source). Traced through every endpoint: `POST /api/analyzer` returns `ChannelAnalysisReport` directly (no `description`); `POST /api/compare` returns `CompareChannelsResult` wrapping the same report shape (no `description`); `POST /api/opportunities` doesn't return channel objects at all (§D.4). **`description` does not reach the browser via any current endpoint.** Making it available to a UI2 card requires a small backend change — add `description` to `ChannelAnalysisReport` and copy it through in both of `analyze-channel.ts`'s return statements — not "zero backend work" as an earlier draft of this audit claimed. |
| "Similar channels" | **Unavailable** | Zero similarity data or algorithm anywhere in the repo — no embeddings, no shared-subscriber/topic data, no ranking signal of any kind. The only YouTube endpoint that could plausibly power this, `search.list`, is a search engine, not a similarity engine, and would need its own query strategy, ranking approach, caching plan, and evaluation method before it could produce anything resembling "similar channels." It is cost-constrained differently than every other endpoint this app uses: `search.list` costs **1 unit/call** (same per-call cost as `channels.list`/`playlistItems.list`/`videos.list`), but it draws from YouTube's separate **Search Queries** quota bucket, which defaults to only **100 calls/day** — a small, independent daily ceiling, not a 100-unit-per-call cost. Must not be built for UI2 without an explicit, separately-scoped design covering query strategy, ranking, caching, and cost (see Product Principles §8). |

### D.2 Video-level fields (source: `analyzeChannel()` → `VideoAnalysis`, and the narrower `OpportunityFeedItem`)

| Field | Status | Notes |
|---|---|---|
| `videoId`, `title`, `publishedAt` | Real | |
| `thumbnailUrl` | Real, best-available size | Correctly uses `pickBestThumbnailUrl()` (unlike channel thumbnails). |
| `durationSeconds` | Real, parsed | Parsed from ISO-8601; videos missing `contentDetails.duration` are silently dropped upstream (never fabricated as 0s) — see `analyze-channel.ts`. |
| `viewCount`, `likeCount`, `commentCount` | Real, nullable | `null` means YouTube did not return the field (e.g. hidden stats), not zero. **UI2 must render "—" or similar, never `0`, for `null`.** Existing tables already do this correctly (`ChannelSummary`, `VideoResultsTable`) — UI2 should copy this convention, not reinvent it. |
| `outlierRatio`, `outlierLevel` | Calculated | Per-video, relative to that video's own channel median. `OpportunityFeedItem.outlierLevel` is narrower (`"outlier" | "strong-outlier"` only — `"normal"`/`"insufficient-data"` items are filtered out before reaching the feed). |
| `channelMedianViews` (on feed items only) | Calculated | Snapshot at analysis time — **never re-fetched**, so a saved Workspace session's numbers can silently go stale relative to the channel's current state. This is already disclosed to the user in the Workspace page copy ("This is a manually saved snapshot, not live data or growth tracking") — any UI2 surface reusing this data must preserve that same disclosure. |
| Video tags/category | **Unavailable** | Never requested (`part=snippet,contentDetails,statistics` only; no `part=snippet` sub-field for tags is parsed even though the API would return it under `snippet.tags` if requested — the current zod schema does not include it). |
| Engagement rate (likes+comments / views) | **Unavailable as a shipped field** | Trivially calculable client-side from existing `likeCount`/`commentCount`/`viewCount` — no backend change needed, just a new pure function, if UI2 wants to show it. Must handle the `null` cases above. |
| Transcript text | **Unavailable** | `lib/transcript/*` is a pure domain model with no fetcher; there is no code path anywhere that produces a `TranscriptDocument` from a real video today. |

### D.3 Saved Workspace data (source: `localStorage`, validated via `lib/workspace/guards.ts`)

| Field | Status | Notes |
|---|---|---|
| Saved session (`id`, `name`, `savedAt`, `inputs`, `result`) | Persisted | Client-only, single-browser, capped at `MAX_SAVED_SESSIONS = 10` with deterministic oldest-first eviction. Every field is runtime-validated on read (`parseStoredSessions`) — corrupt/foreign localStorage data is silently dropped, never trusted. |
| Cross-device sync | **Unavailable** | No backend, no auth, no Supabase wiring (confirmed: zero references to `SUPABASE_*` env vars anywhere in `lib/` or `app/`). |

### D.4 Traced response shape: `POST /api/opportunities` (why this matters for F.1/Stage 3)

"Fetched internally at some point in the pipeline" and "returned to the browser by the endpoint a given screen actually calls" are different claims. Because an earlier draft of this audit conflated them for the Opportunities screen, the full pipeline was re-traced call by call, reading each function's actual input/output types:

1. **`compareChannels(inputs)`** (`lib/channel-analyzer/compare-channels.ts`) calls `analyzeChannel()` per input and returns `CompareChannelsResult { results: ChannelCompareEntry[] }`. Each successful entry's `report` is a full `ChannelAnalysisReport & { outlierRate }` — this **does** include `thumbnailUrl`, `subscriberCount`, `totalViewCount`, `videoCount`, `medianViews`, `analyzedVideoCount`, `outlierRate`, and the full `videos[]` array.
2. **`buildOpportunityFeed(compareResult)`** (`lib/channel-analyzer/build-opportunity-feed.ts`) consumes that `CompareChannelsResult` but its `toFeedItem()` helper only reads `report.channelId`, `report.title`, `report.medianViews`, and each video's own fields to build each `OpportunityFeedItem`. It returns `OpportunityFeedResult { items: OpportunityFeedItem[], failures: OpportunityFeedFailure[] }`. **`thumbnailUrl`, `subscriberCount`, `totalViewCount`, `videoCount`, and `outlierRate` are read nowhere in this function and do not appear anywhere on `OpportunityFeedItem` or `OpportunityFeedResult` — confirmed directly from `lib/channel-analyzer/types.ts`.**
3. **`POST /api/opportunities`** (`app/api/opportunities/route.ts`) calls `compareChannels()` then `buildOpportunityFeed()`, and returns **only** `feed` (the `OpportunityFeedResult`) as JSON: `return NextResponse.json(feed, { status: 200 })`. The intermediate `compareResult` — the object that actually contains the rich channel data — is computed, then discarded server-side, and never serialized to the client.
4. **`OpportunityFeedClient`** receives and types this JSON as `OpportunityFeedResult` and renders `result.items` via `OpportunityFeedTable`.

**Net result: the only channel-level fields that reach the browser through `/api/opportunities` are `channelId`, `channelTitle`, and `channelMedianViews` — all three attached per video item, not as a distinct channel object.** `thumbnailUrl`, `subscriberCount`, `totalViewCount`, `videoCount`, and `outlierRate` are fetched server-side during this same request but are **not** part of this endpoint's response contract today.

By contrast, **`POST /api/compare`** (`app/api/compare/route.ts`) returns the full `CompareChannelsResult` unchanged (`return NextResponse.json(result, { status: 200 })`) — every one of those channel-level fields **is** already in that endpoint's response.

**Persistence constraint that shapes how this gap must be fixed:** `OpportunityFeedResult` — the exact type returned by `/api/opportunities` today — is also the exact type persisted verbatim into `localStorage` by `SaveResearchButton` → `saveSession()` (`lib/workspace/storage.ts`), and validated on read by `isValidOpportunityFeedResult()` (`lib/workspace/guards.ts`). Adding a required `channels` field directly to `OpportunityFeedResult` would mean **every session saved before that change stops validating** — `parseStoredSessions()` silently drops (via `skippedCount`) any session that fails `isValidSavedResearchSession`, so existing users' saved Workspace sessions would disappear the next time they open `/workspace`, with no error shown. This must not happen. The correct fix (detailed in Stage 3, §9) is a **separate wrapper response type for the live endpoint only** — `OpportunityFeedApiResponse { feed: OpportunityFeedResult; channels: readonly OpportunityChannelSummary[] }` — leaving `OpportunityFeedResult` itself, `lib/workspace/storage.ts`, and `lib/workspace/guards.ts` completely untouched, so no migration is needed and no existing saved session is put at risk.

This distinction directly changes the "Available data" claim in §F.1 (Opportunities channel grid) and the scope of Stage 3 — both are corrected below to reflect it.

### D.5 Availability vs. display approval — summary rule for UI2 screen design

"Real" or "Calculated" in this matrix means the data is *available* — fetched or computable today, **by some endpoint in this app**, per §D.4's caution that "available" must be checked per-endpoint, not assumed pipeline-wide. Availability does **not** by itself mean the data is *approved for UI display* — that is a separate, per-screen product decision. Two concrete fields are available today but not currently shown anywhere, and existing data is genuinely under-used in these two cases:

- Per-video engagement rate (trivially calculable from already-fetched `likeCount`/`commentCount`/`viewCount` on `VideoAnalysis`/`OpportunityFeedItem`, both of which already reach the browser via `/api/analyzer` and `/api/opportunities` respectively — §D.2 — but engagement rate itself is not currently computed or displayed anywhere).

This is a legitimate candidate for UI2 with a **trivial pure-function addition** (no new fetch, no schema change), but still needs its own explicit "show this" decision written into its screen's plan (§F) — availability alone is not sufficient justification to add it to a card.

**Correction to an earlier draft of this audit:** channel `description` was previously listed here as a second "available but unused" example. §D.1 corrects this after tracing the actual response shapes — `description` is fetched onto `ResolvedChannel` but is dropped before `ChannelAnalysisReport` is built and does not reach any endpoint's response today. It is therefore **not** currently "available" in the sense this rule cares about (data already in a screen's browser response); it requires the small backend change described in §D.1 first, not just a UI decision.

**Rule for UI2 screen design:** no UI2 screen may display a metric, image, or interaction that is not in the "Real" or "Calculated" rows above, for the specific endpoint that screen actually calls, without an explicit "Missing data — requires backend work" callout in its own plan section (§F). Conversely, a field being "Real"/"Calculated" here is necessary but not sufficient to justify showing it — each screen's plan must still make that call explicitly.

---

## E. Component Reuse Map

### E.1 Safe to reuse directly (no changes needed)

- `OutlierBadge` (`components/channel-analyzer/OutlierBadge.tsx`) — drop into any new **video** card/grid cell (F.2, F.3, F.4). Its prop is `{ level: OutlierLevel }`, a per-video categorical value — **not reusable as-is for a channel-level `outlierRate: number` display** (F.1); see the correction there.
- `TitlePatternPanel` (`components/title-patterns/TitlePatternPanel.tsx`) — already reused across 2 surfaces (opportunities, workspace); no changes needed for a 3rd.
- `AppShell` navigation model — extending `NAVIGATION_SECTIONS` in `components/app-shell/navigation.ts` is the correct, already-proven way to add a UI2 route to the shell (exact same pattern used for all 4 existing routes).
- `lib/channel-analyzer/*`, `lib/analysis/*` — read from these types; do not duplicate the report/compare/feed shapes.

### E.2 Reuse after extraction (duplicated today — see Blockers §C.2–C.4)

- `isApiErrorBody()` → extract to `lib/http/api-error.ts` (or similar), single source, used by every client component.
- `formatDuration()` → extract to a shared formatting util, used by any new grid card showing duration.
- `buildYoutubeWatchUrl()` → extract alongside `formatDuration()`.
- The `idle|loading|success|error` **state shape** is identical across `ChannelAnalyzerClient`/`ChannelCompareClient`/`OpportunityFeedClient`, but the actual request flows are **not** identical enough to extract into one shared hook without awkward configuration, on direct comparison of the three files: `ChannelAnalyzerClient` posts a single `{ input: string }`; `ChannelCompareClient` and `OpportunityFeedClient` post `{ inputs: string[] }` with the same 2–5-line validation, but `OpportunityFeedClient` additionally runs an extra response-shape guard (`isOpportunityFeedResult()`, not present in the other two), tracks a separate `successfulInputs` snapshot for `SaveResearchButton`, and derives `titlePatternReport` via `useMemo` — none of which the other two components need. A generic `useApiSubmit` hook would either have to grow enough options/callbacks to cover `OpportunityFeedClient`'s extra concerns (defeating the simplification) or leave them bolted on outside the hook (limiting how much duplication it actually removes). **This audit does not recommend building this hook now** — only the genuinely byte-identical `isApiErrorBody()` is a clean extraction today (§C.2). A shared submit hook remains a reasonable idea for a later, separately-scoped PR once a 4th/5th UI2 component reveals a clearer common shape, but should not be speculatively built ahead of that evidence.

### E.3 New components required for UI2 (do not exist in any form today)

- Channel grid / channel card (Opportunities channel grid, Similar Channels if ever approved)
- Video grid / video card (Analyzer video grid)
- Any in-app detail view/modal/route for a channel or video (today: zero in-app detail UI exists; the only "detail interaction" is an external link to `youtube.com/watch`)
- Workspace grid (currently a vertical `<ul>` of session rows, not a grid — and see §F.4 for both an unresolved product question about what "Workspace grid" even means, and a real type mismatch between Analyzer's `VideoAnalysis` and Workspace/Opportunities' `OpportunityFeedItem` that means a Workspace card is not simply "the Analyzer card reused")
- Any shared `<Grid>`/`<ResponsiveGrid>` layout primitive — no grid layout component exists anywhere in `components/`; every current layout is `flex-col` + a `<table>`.

---

## 5 / F. UI2 Target Screens — Readiness and Staged Implementation Plan

### F.0 Cross-cutting notes (apply to every screen below)

- **Reusable across the video-level screens (F.2, F.3, F.4):** `OutlierBadge`. **Reusable across all screens, including the channel-level F.1:** `lib/channel-analyzer/*` types, `AppShell` nav pattern, and (after the extraction PR) the shared error/loading/duration/watch-URL utilities. `OutlierBadge` does **not** extend to F.1's channel-level `outlierRate` — see the correction in F.1.
- **New across all screens:** a grid layout primitive, card components, and — per Product Principle "no unsupported metrics" — strict adherence to the Data Capability Matrix (§D).
- **API/domain changes common to more than one screen:** fixing `resolveChannel.ts` to use `pickBestThumbnailUrl()` for channel avatars (affects Opportunities channel grid and any channel card); adding `images.remotePatterns` to `next.config.ts` if `next/image` is adopted.

### F.1 Opportunities channel grid

- **Available data (corrected after tracing the actual response — §D.4):** `POST /api/compare` already returns full channel-level data (`title`, `thumbnailUrl`, `subscriberCount`/`totalViewCount`/`videoCount`, `medianViews`, `outlierRate`) to the client. `POST /api/opportunities` — the endpoint the Opportunities screen actually calls — does **not**; its `OpportunityFeedResult` response carries only `channelId`, `channelTitle`, and `channelMedianViews`, attached per video item, not as a channel object (§D.4).
- **Missing data (from the Opportunities endpoint specifically):** channel `thumbnailUrl`, `subscriberCount`, `totalViewCount`, `videoCount`, and `outlierRate` are **not in the current `/api/opportunities` response** and must be added before a channel grid can be built from this screen's own data — this is a real API/domain change, not just a rendering change (see below). Separately, and only relevant once that field is added: larger channel thumbnail quality (needs the `pickBestThumbnailUrl` fix, §D.1 — trivial); channel banner (not fetched at all — would need a new `part` value); "similar channels" (unavailable, §D.1/§F.5 — out of scope).
- **Reusable components (corrected):** **not** `OutlierBadge` — checked its actual prop contract (`{ level: OutlierLevel }`, `components/channel-analyzer/OutlierBadge.tsx`) against what a channel card needs: `ChannelAnalysisReport`'s `outlierRate` is `number | null` (a fraction, e.g. `0.4`), not an `OutlierLevel` string — there is no function anywhere in the codebase that buckets a channel's aggregate `outlierRate` into an `OutlierLevel`-shaped category, so `OutlierBadge` cannot be handed this value as-is. The codebase's existing convention for displaying this exact field is `ComparisonTable`'s local `formatOutlierRate(rate: number | null): string` (rounds to a whole-number percentage, or `"—"` for `null`) — that formatting convention, not `OutlierBadge`, is what a `ChannelCard` should reuse or extract-and-reuse. Channel data types from `lib/channel-analyzer/types.ts` remain reusable.
- **New components required:** `ChannelCard`, grid layout primitive, and — if a visual badge (not just formatted text) is wanted for channel outlier rate — a new channel-level badge component (or a `formatOutlierRate`-based text treatment, matching `ComparisonTable`'s existing convention) is needed; `OutlierBadge` itself cannot be reused for this.
- **API/domain changes required (corrected — required, and corrected again to avoid a real backward-compatibility bug):** the `POST /api/opportunities` route must be extended to also return channel-level summary data, sourced from the `compareResult` it already computes internally today but currently discards. **This must not be added as a new field on `OpportunityFeedResult` itself** — `OpportunityFeedResult` is also the exact type persisted verbatim to `localStorage` by `SaveResearchButton`/`saveSession()` and validated on read by `isValidOpportunityFeedResult()` (`lib/workspace/guards.ts`); making a field on it required would silently invalidate and drop every session saved before the change (see the persistence constraint in §D.4). Instead, the route's response shape becomes a new wrapper type, e.g. `OpportunityFeedApiResponse { feed: OpportunityFeedResult; channels: readonly OpportunityChannelSummary[] }`, with `OpportunityFeedResult` itself completely unchanged. `OpportunityFeedClient` then reads `json.feed` into its existing `result` state (unchanged downstream — `SaveResearchButton`, `OpportunityFeedTable`, and everything in `lib/workspace/*` keep receiving the exact same shape they do today) and `json.channels` into new, separate state for the grid. Grouping `OpportunityFeedItem[]` by `channelId` alone is not a substitute — it only supplies `channelId`/`channelTitle`/`channelMedianViews`, not thumbnail/subscriber/view/video-count/outlier-rate — but with this design it isn't needed either, since `channels` is returned as its own array.
- **Major risks:** the response-shape gap above was not caught by reading types in isolation in an earlier pass of this audit — it only surfaced by tracing the actual data flow function-by-function (§D.4). Any future screen-readiness review for this app should trace responses the same way rather than assuming "fetched somewhere in the pipeline" means "available to this screen."
- **Recommended order:** after the extraction PR (§H) and after the video grid (F.2); the API response-shape change above should land as part of Stage 3 — see the corrected Stage 3 scope in §9.

### F.2 Analyzer video grid

- **Available data:** every field on `VideoAnalysis` — `title`, `thumbnailUrl` (best-available already), `publishedAt`, `durationSeconds`, `viewCount`/`likeCount`/`commentCount` (nullable), `outlierRatio`/`outlierLevel`. Fully present today via `POST /api/analyzer`, already rendered (as a table) by `VideoResultsTable`.
- **Missing data:** none for a straightforward grid — this is the **lowest-risk** UI2 screen from a data standpoint. Engagement rate is calculable but not currently a field (trivial pure-function addition if wanted).
- **Reusable components:** `OutlierBadge`, `formatDuration` (post-extraction), all of `VideoResultsTable`'s existing data-formatting decisions (null → "—", not "0").
- **New components required:** `VideoCard` for `VideoAnalysis` (has `likeCount`/`commentCount`, no channel fields), grid layout primitive (shared with F.1/F.4). **Note:** this is a different data shape from `OpportunityFeedItem` (used by F.1/F.4 — see the corrected F.4 below) — do not assume this exact card can be reused unmodified for Opportunities or Workspace.
- **API/domain changes required:** none. This screen is a pure presentation change over already-shipped data.
- **Major risks:** low. The only real risk is performance/layout (25 thumbnails rendering at once in a grid vs. a table — see §G) and click-through decision (does a card link out to YouTube like `OpportunityFeedTable` already does, or open something in-app — see F.3).
- **Recommended order:** **first UI2 screen to build**, once the grid/card primitives exist, because it needs zero new data or aggregation logic — purest test of the new layout primitives.

### F.3 Channel or video detail interactions

- **Available data:** whatever is already on `VideoAnalysis`/`ChannelAnalysisReport` — no additional fetch is needed for a detail *panel* populated from data the app already has in memory from the triggering request.
- **Missing data:** anything beyond what's already fetched (video tags/category, transcript, engagement history, comments) is unavailable without new API calls; a "detail view" that implies more than what's already fetched must not silently under-deliver — it should either fetch more (new quota cost, new schema fields) or be explicit that it's showing the same data already visible in the grid, just laid out differently.
- **Reusable components:** none exist — this is 100% new. Today there is no modal, no drawer-for-content (the only drawer in the codebase is the mobile *navigation* drawer, which is a different concept and should not be repurposed), no detail route.
- **New components required:** a detail panel/modal/route (design decision, not yet made anywhere in the code) plus whatever data-fetching wiring it needs.
- **API/domain changes required:** depends entirely on scope. If "detail" means "the same fields, larger layout" — zero. If it means "fetch a single video's extra fields (tags, category)" — new zod schema fields on `youtubeVideoItemSchema`, new fields on `VideoAnalysis`, new formatting.
- **Major risks:** scope creep risk is highest here of any UI2 screen — "detail interactions" is the vaguest of the five target screens and the one most likely to accidentally pull in unsupported data. Recommend explicitly deciding "detail = larger layout of already-fetched data, no new fetch" for the first version.
- **Recommended order:** **last**, after grids exist and after channel/video card components are stable, since a detail view is naturally an expansion of a card.

### F.4 Research Workspace grid

- **Available data:** identical to what `WorkspaceClient` already renders per saved session (`OpportunityFeedItem[]`, the same type `/opportunities` itself uses, via the embedded `OpportunityFeedTable`). No new data.
- **Missing data:** none.
- **Reusable components:** `OutlierBadge`. **Not** `VideoCard` from F.2 as-is, corrected from an earlier draft of this audit that claimed otherwise: F.2's card is built for `VideoAnalysis` (Analyzer's per-video type — has `likeCount`/`commentCount`, no `channelId`/`channelTitle`/`channelMedianViews`), while Workspace and Opportunities both use `OpportunityFeedItem` (has channel fields, no like/comment counts). These are genuinely different shapes, not the same type under a different name — confirmed directly from `lib/channel-analyzer/types.ts`. Three ways to still share presentation code, in increasing order of effort:
  1. **Separate thin wrapper components** over one shared presentational base (e.g. a `VideoCardBase` that takes only the fields both types have — `title`, `thumbnailUrl`, `publishedAt`, `durationSeconds`, `viewCount`, `outlierRatio`, `outlierLevel` — plus optional slots for the fields that differ), with e.g. `AnalyzerVideoCard`/`FeedVideoCard` each mapping their own type into those props. Lowest risk, most explicit.
  2. **Adapter functions** (e.g. `toCardViewModel(video: VideoAnalysis)` and `toCardViewModel(item: OpportunityFeedItem)`) that both produce one shared view-model type, consumed by a single `VideoCard`.
  3. **A single shared view-model type** with the common fields required and the type-specific fields (`likeCount`/`commentCount` vs. `channelId`/`channelTitle`/`channelMedianViews`) optional — riskier, since the card component then has to branch internally on "does this field exist."
  This audit does not pick one — that decision belongs to whoever implements Stage 1/Stage 2, informed by how much the two cards' visual designs actually diverge (a bigger visual difference favors option 1; near-identical visuals favor option 2).
- **New components required:** depends on the option chosen above — at minimum a Workspace-specific wrapper or adapter, not "none" as an earlier draft of this audit assumed.
- **API/domain changes required:** none.
- **Unresolved product decision — what does "Workspace grid" mean?** `WorkspaceClient` today has two distinct levels: an outer list of **saved sessions** (name, saved date, channel/video counts, select/delete actions — currently a `<ul>` of session rows) and, once a session is selected, an inner **video list** for that session's `OpportunityFeedItem[]` (currently the embedded `OpportunityFeedTable`). "Workspace grid" could mean a grid of session cards at the outer level, a grid of video cards inside a selected session at the inner level, or both at different stages. This audit does not assume an answer — it must be decided explicitly before Stage 2 is scoped in detail.
- **Major risks:** building a Workspace `VideoCard` as a naive copy-paste of the Analyzer one (or vice versa), or papering over the type mismatch above with an `as` cast, recreates exactly the duplication/type-safety problem this audit flags elsewhere (§C/§E).
- **Recommended order:** after F.2, since it needs F.2's grid primitive and at least one of the three sharing strategies above to exist; the "sessions grid vs. inner video grid" decision should be made explicitly before implementation starts.

### F.5 Similar channels

- **Available data:** none.
- **Missing data:** everything — no similarity signal of any kind (no shared-subscriber data, no topic/category data fetched, no embeddings, no collaborative-filtering data) exists anywhere in the repository or its data pipeline.
- **Reusable components:** the eventual `ChannelCard` from F.1, once one exists.
- **New components required:** N/A until the underlying capability exists.
- **API/domain changes required:** substantial and undesigned — either a `search.list`-based lookup or a new similarity algorithm, and neither exists today in any form. `search.list` is not itself a similarity engine (it is YouTube's keyword/topic search endpoint); using it to approximate "similar channels" would require a query strategy (what to search for), a ranking approach (how to score results as "similar"), a caching plan, and an evaluation method — none of which exist. Cost-wise, `search.list` is 1 unit/call, the same as the endpoints already in use, but it is governed by a separate, much smaller **100-calls/day** default allowance (the Search Queries bucket), not the general daily unit quota — a real constraint, just not a 100-units-per-call one. This is a **backend research task, not a UI2 rendering task**.
- **Major risks:** cost (quota), scope (no existing design), and violates the explicit Product Principle against premature Similar Channels (§8). **Do not build in this UI2 pass.**
- **Recommended order:** **excluded from this UI2 delivery cycle entirely**, pending a separate, explicitly-approved data/cost design.

---

## 6. Testing and Quality Baseline

### Verification Log (commands actually run during this audit, in this order, on this branch)

```
$ npm test
> vitest run
 Test Files  26 passed (26)
      Tests  390 passed (390)

$ npm run lint
> eslint
(no output — clean)

$ npm run typecheck
> tsc --noEmit
(no output — clean)

$ npm run build
> next build
✓ Compiled successfully
✓ Generating static pages (11/11)
Route (app): /, /_not-found, /analyzer, /api/analyzer, /api/compare, /api/opportunities, /compare, /opportunities, /workspace
```

All four commands passed with **no modifications made** to reach this state — this is the actual state of `main` as merged.

### Coverage reality

- **23 unit test files** — cover nearly every `lib/**` module (median, outlier, YouTube parsing/schemas/client/duration/thumbnail/quota, channel-analyzer pipeline, title-patterns, workspace storage/guards, transcript domain, app-shell navigation pure functions, video-id-parser). This layer is genuinely strong.
- **3 integration test files** — `tests/integration/api/{analyzer,compare,opportunities}-route.test.ts`, exercising the route handlers directly (not via HTTP).
- **0 component/DOM tests** — no `@testing-library/react`, no `jsdom` (confirmed in `package.json` and `vitest.config.ts`: `environment: "node"`). Nothing in `components/**` has a test file.
- **0 browser/E2E tests** — no Playwright, no Cypress, nothing in `package.json`.

### What this means concretely, and the chosen testing policy

Every UI1 shell bug found in this project's real history (initial-mount focus steal, "Blocked aria-hidden" console warning, mobile drawer not closing after navigation) was **invisible to the existing automated test suite** and was only caught by a human testing in an actual browser. UI2 grids introduce more of exactly this class of surface: image loading, keyboard navigation across a 2D grid, hover/focus states on cards, responsive reflow at multiple breakpoints.

Two policies were possible here: (a) require a separate test-infrastructure PR (adding `jsdom`/testing-library) before Stage 1 begins, or (b) explicitly accept manual-QA-only interaction coverage for the first grid PR and record the gap as a tracked risk. **This audit chooses policy (b) for Stage 1** — for consistency with Product Principle 3 (no new dependency without justification) and to keep the first grid PR small. Manual QA (per each stage's checklist in §9/F) is the accepted interaction-coverage gate for Stage 1, and this gap is recorded in the Risk Register (§G) rather than silently ignored.

This is **not** a permanent policy. Before Stage 4 (detail interactions — the highest scope-creep risk of any stage) or before any stage introducing genuinely complex keyboard interaction (e.g. an ARIA-grid 2D navigation pattern), adding component-level testing infrastructure should be revisited as its own explicitly-approved decision, not assumed either way.

What *is* required now, with no new dependency:

1. A repeatable, checked-in manual QA checklist (this project has been doing this ad hoc, turn by turn, in chat — it should become e.g. `docs/manual-qa-checklist.md`) covering keyboard grid navigation, image alt text, and responsive breakpoints.
2. Regression tests for the three currently-duplicated helpers, once extracted in Stage 0 (trivial, pure-function, no new dependency).

---

## 7. Performance and Accessibility

Evidence-based findings only — no speculative recommendations.

### Performance

- **Images:** every thumbnail in the codebase (`ChannelSummary`, `VideoResultsTable`, `OpportunityFeedTable`) uses a raw `<img>` (each with an `eslint-disable-next-line @next/next/no-img-element` comment — a deliberate, acknowledged choice, not an oversight). No `next/image`, no `loading="lazy"` attribute, no explicit `width`/`height`. Today this affects at most ~25 thumbnails per analyzer/compare/opportunities result. **A UI2 grid rendering the same or more thumbnails at once, without lazy-loading or dimensions, is a real risk for layout shift (CLS) and initial network cost** — this is the single most concrete, evidence-based performance risk for UI2 specifically.
- **Bundle:** dependency set is minimal (`next`, `react`, `react-dom`, `zod` only in `dependencies`) — no bundle bloat risk from third-party UI kits today. Any UI2 grid/card library choice should preserve this (Product Principle: no new dependency without justification).
- **Rendering:** all data fetching today is client-initiated (`fetch` inside `"use client"` components after a form submit) — no server-side data fetching for the interactive screens, no streaming/Suspense usage anywhere in `app/`. A UI2 grid could reasonably stay in this same pattern (no architecture change forced), but note there is no streaming precedent to copy if a future screen wants one.
- **List rendering:** all current tables use `.map()` with a stable `key` (`video.videoId`, `report.channelId`, etc.) — no virtualization anywhere, and none is needed yet at current result sizes (≤25 videos, ≤5 channels). A grid showing the same bounded counts does not need virtualization either; this would only become a risk if a future stage increases per-channel result size well beyond 25.

### Accessibility

- **Semantic structure:** current tables use real `<table>`/`<thead>`/`<tbody>`/`<th>` — genuinely accessible tabular structure. **A grid replacing a table needs an equivalent accessible structure** (e.g., a `<ul>`/`<li>` list with proper landmark/heading structure, or ARIA grid pattern if true 2D keyboard navigation is wanted) — this is a real design decision UI2 must make explicitly, not default silently to a plain `<div>` soup.
- **Images:** all `alt=""` (decorative), with the video/channel title rendered as adjacent visible text providing the accessible name — this is a defensible, correct pattern already in use and should be continued by any new card component (do not add a redundant `alt="{title}"` that would double-announce the title).
- **Keyboard:** existing tables have no special keyboard handling (native scroll/tab order is sufficient for a table). A **grid of clickable cards is a new keyboard-navigation surface** with no existing precedent in this codebase — the only prior art for custom keyboard handling is the mobile nav drawer's Tab-trap (`components/app-shell/app-shell.tsx`, `handleDrawerKeyDown`), which is a different problem (containment, not 2D navigation) and should not be copied wholesale.
- **Focus management:** the `AppShell` mobile drawer now correctly blurs focus before hiding, restores focus appropriately, and never triggers "Blocked aria-hidden" (verified in real-browser QA per this project's own history, and the current source matches that verified state exactly). This pattern (blur-before-hide, explicit restore-vs-don't-restore) is directly reusable if UI2 introduces any other dismissible overlay (e.g., a detail modal, F.3).
- **Color/contrast:** dark mode is `prefers-color-scheme`-driven only (`app/globals.css`), no manual toggle exists; all current `dark:` Tailwind classes were not independently contrast-audited as part of this pass (out of scope — no visual tool was used) and should be spot-checked once real UI2 card designs exist.

---

## 8. Product Principles for UI2

These are stated as build rules, derived directly from the gaps and strengths found in this audit — not aspirational, but scoped to what this codebase's current data and architecture can actually support.

1. **Data truth over decorative UI.** Every number, badge, or image shown must trace to a "Real" or "Calculated" row in §D. If a screen wants to show something not in that matrix, the plan for that screen must say so explicitly and mark it as requiring backend work — never silently approximate or invent a value.
2. **Desktop-first without breaking mobile.** The existing `AppShell` breakpoint (`lg:` / 1024px) is the current desktop/mobile boundary; UI2 grid column counts should be designed against this same breakpoint set (Tailwind defaults: `sm`/`md`/`lg`/`xl`, no custom breakpoints defined anywhere in this repo) rather than inventing new ones.
3. **Reusable components instead of duplicated page markup.** This audit found three exact-duplicate helper functions and a duplicated status-machine pattern across three existing pages — UI2 must not add a fourth/fifth copy of any of them (§C, §E).
4. **Progressive disclosure.** No current screen dumps every possible field at once — e.g. `ComparisonTable` shows aggregate stats, not per-video detail. UI2 grids should follow the same instinct: cards show the summary, a detail interaction (F.3) shows more, rather than every card trying to show everything.
5. **Strong loading, empty, and error states.** The existing `idle|loading|success|error` pattern and explicit "no results" empty states (`VideoResultsTable`'s empty-channel message, `OpportunityFeedClient`'s "No recent analyzed videos reached the 2× outlier threshold") are the bar UI2 must meet. The current gap is route-level `loading.tsx`/`error.tsx` (§C.1) — that gap should close before UI2 adds more fetch surfaces.
6. **No unsupported metrics.** Do not display subscriber growth, view growth, trend arrows, or any time-series claim — there is no persistence layer capable of tracking change over time (confirmed: `POST /api/opportunities` computes everything fresh per request; Workspace explicitly discloses its saved sessions are snapshots, not tracking).
7. **No premature Similar Channels feature.** Confirmed in §D.1/§F.5: zero data or algorithm exists. Do not build any version of this screen in the UI2 delivery cycle.
8. **Avoid copying another product's branded design.** Not evaluated visually in this audit (no design assets exist yet), but stated as a build constraint for whoever designs the grid/card visuals.

---

## 9 / F (continued). UI2 Staged Delivery Plan — Small, Reviewable PRs

Each stage is scoped to be independently reviewable and revertible. No stage after Stage 0 should be started until the prior stage is merged.

### Stage 0 — Cleanup and UI foundations — limited intentional UX changes, no grid implementation

- **Scope:** extract `isApiErrorBody`, `formatDuration`, `buildYoutubeWatchUrl` to shared locations (see §E.2 — a shared `useApiSubmit` hook is explicitly **not** part of this scope); add `loading.tsx`/`error.tsx` at the root (`app/`) level as route-level resilience improvements (§C — these do not change or replace the existing client-fetch loading states, which are untouched); wire the landing page "Get Started" button to `/analyzer` (the most natural first destination, matching the page's own copy about "discover breakout channels, analyze video outliers"); fix `resolveChannel.ts` to use `pickBestThumbnailUrl()`; **create the checked-in manual QA checklist** (`docs/manual-qa-checklist.md`, §6) that every subsequent stage's manual QA checklist in this plan extends — this closes the gap where §6 calls it "required now" without any stage actually producing it. The landing CTA, the new loading/error UI, and the improved thumbnail quality are **intentional, visible UX changes** — this stage is not a no-op.
- **Affected routes:** all of them (shared utils, loading/error boundaries), `/` (button fix), no new routes.
- **Expected files:** new `lib/http/api-error.ts` (or similar), new `lib/format/*.ts` (or similar) for duration/watch-URL, `app/loading.tsx`, `app/error.tsx` (Client Component, `"use client"`, with an `error`/`reset` recovery action), edits to `app/page.tsx`, edits to `lib/youtube/resolve-channel.ts`, edits to the 3 client components + 2 table components to import the shared utils instead of redefining them, new `docs/manual-qa-checklist.md`.
- **Tests:** unit tests for the newly-extracted pure functions (trivial, mirrors existing test style); update `resolve-channel.test.ts` to assert `pickBestThumbnailUrl` behavior for channel thumbnails.
- **Manual QA checklist:** all 4 existing feature pages (`/analyzer`, `/compare`, `/opportunities`, `/workspace`) render identically to before this stage — this stage's only *intentional* UX changes are the landing CTA, the new route-level loading/error boundaries, and improved channel thumbnail quality, nothing else should visibly change; landing page button navigates to `/analyzer`; a channel with only a `default`-size thumbnail vs. one with a `maxres` thumbnail both render correctly (and are visibly sharper where a `maxres`/`high` thumbnail is now used instead of always `default`); triggering a thrown render error (e.g. temporarily in dev) shows the new `error.tsx` recovery UI instead of a raw stack trace, and its retry action works.
- **Dependencies:** none (no new packages).
- **Explicit non-goals:** no grid, no card component, no new route, no new API field beyond the thumbnail fix, no shared request-submission hook.

### Stage 1 — Grid/card layout primitive + Analyzer video grid (F.2)

- **Scope:** build the shared grid layout primitive and `VideoCard`; add a grid rendering path to the Analyzer screen (as a new view alongside or replacing `VideoResultsTable` — decision belongs to this stage's PR description, not this audit). **This stage must explicitly decide whether `VideoCard` adopts `next/image` or keeps raw `<img>`** (§C's reclassified `images.remotePatterns` item): if `next/image`, add `images.remotePatterns` for `i.ytimg.com`/`yt3.ggpht.com` to `next.config.ts`; if raw `<img>` (consistent with today's codebase), add explicit `width`/`height` and `loading="lazy"` to the new `<img>` elements instead.
- **Affected routes:** `/analyzer` only.
- **Expected files:** new `components/ui/Grid.tsx` (or similar shared primitive), new `components/channel-analyzer/VideoCard.tsx`, edits to `ChannelAnalyzerClient.tsx`, **and `next.config.ts` only if `next/image` is chosen**.
- **Tests:** none new at the domain layer (no data change). Per the testing policy decided in §6, manual QA is the accepted interaction-coverage gate for this stage — this is a deliberate, recorded decision, not an oversight.
- **Manual QA checklist:** grid renders for a real channel with 25 analyzed videos; empty state (channel with 0 analyzable videos) still shows the existing dashed-border message; null `viewCount`/`likeCount`/`commentCount` render as "—"; keyboard Tab order through the grid is sane; no horizontal overflow at mobile widths; images do not cause visible layout shift.
- **Dependencies:** Stage 0 merged (uses the extracted `formatDuration`).
- **Explicit non-goals:** no channel grid, no detail view, no Workspace changes.

### Stage 2 — Research Workspace grid (F.4)

- **Scope (corrected — this is not a simple reuse of Stage 1's card):** first, resolve the unresolved product decision in F.4 — does "Workspace grid" mean the outer saved-sessions list, the inner per-session video list, or both? Then implement whichever of the three sharing strategies from F.4 (thin wrapper / adapter / shared optional-fields view-model) was chosen, since Stage 1's `VideoCard` is built for `VideoAnalysis`, not `OpportunityFeedItem`, and cannot render Workspace data unmodified.
- **Affected routes:** `/workspace` only.
- **Expected files (corrected — not necessarily `WorkspaceClient.tsx` alone):** likely edits to `components/workspace/WorkspaceClient.tsx`; likely a new adapter/view-model file or a new Workspace-specific card wrapper component, depending on which F.4 sharing strategy is chosen; possibly edits to the Stage 1 `VideoCard` itself if the shared-view-model strategy is chosen instead of separate wrappers.
- **Tests:** unit tests for the adapter/view-model mapping function if that strategy is chosen (pure, easily tested). Per §6's policy, no component-level test is required for the card rendering itself — manual QA is the accepted gate.
- **Manual QA checklist:** saved sessions still list/select/delete correctly; the "manually saved snapshot" disclosure text is still present and visible; a session with 0 items still shows its existing empty message; whichever grid level was chosen (sessions vs. inner videos) renders correctly for a session with multiple channels represented.
- **Dependencies:** Stage 1 merged; the F.4 product decision made explicitly before implementation starts.
- **Explicit non-goals:** no change to `lib/workspace/*` storage logic, no new session fields.

### Stage 3 — Opportunities channel grid (F.1)

- **Scope (corrected twice now — two parts, and the first part must not touch the persisted type):** §D.4's response trace found that channel-level summary fields (thumbnail, subscriber/view/video counts, outlier rate) do not currently reach the browser via `/api/opportunities`. A first correction to this audit proposed adding a `channels` field directly to `OpportunityFeedResult` to fix this — that was wrong, because `OpportunityFeedResult` is also the exact type persisted to `localStorage` (§D.4's persistence constraint), and making a field on it required would silently drop every pre-existing saved Workspace session on next load. The corrected scope:
  1. **Domain/API response change, via a new wrapper type, not a change to `OpportunityFeedResult`:** introduce `OpportunityChannelSummary` (channel-level fields already computed inside `compareChannels()` but currently discarded: `channelId`, `title`, `thumbnailUrl`, `subscriberCount`, `totalViewCount`, `videoCount`, `medianViews`, `analyzedVideoCount`, `outlierRate`) and `OpportunityFeedApiResponse { feed: OpportunityFeedResult; channels: readonly OpportunityChannelSummary[] }` in `lib/channel-analyzer/types.ts`. `app/api/opportunities/route.ts` returns `OpportunityFeedApiResponse` instead of the bare `OpportunityFeedResult`. `OpportunityFeedResult` itself is **not modified** — same fields, same shape, as today.
  2. **Client change:** `OpportunityFeedClient`'s local `isOpportunityFeedResult()` response guard becomes `isOpportunityFeedApiResponse()` (checks both `feed` and `channels`); on success it calls `setResult(json.feed)` (its existing `result` state stays typed `OpportunityFeedResult`, so `SaveResearchButton` and `OpportunityFeedTable` receive **exactly what they receive today, unchanged**) and stores `json.channels` in new, separate state for the grid.
  3. **UI change:** new `ChannelCard`, new grid view on `/opportunities` (alongside or instead of the current flat video table — decision belongs to this stage), consuming the `channels` array from part 2 directly.
- **Affected routes:** `/opportunities` page **and** the `POST /api/opportunities` route handler (response shape change) — **not** `/workspace`, not `lib/workspace/*` (see below).
- **Expected files:** edits to `lib/channel-analyzer/types.ts` (new `OpportunityChannelSummary` and `OpportunityFeedApiResponse` types, `OpportunityFeedResult` itself unchanged), edits to `app/api/opportunities/route.ts` (build and return the wrapper response), edits to `OpportunityFeedClient.tsx` (updated response guard, split `feed`/`channels` state), new `components/opportunity-feed/ChannelCard.tsx`. **Explicitly not touched:** `lib/workspace/storage.ts`, `lib/workspace/guards.ts`, `lib/workspace/types.ts`, `components/workspace/SaveResearchButton.tsx`, `components/workspace/WorkspaceClient.tsx` — none of them read or depend on the new `channels` data, and their input type (`OpportunityFeedResult`) is unchanged by design.
- **Tests:** unit tests for the new channel-summary-producing logic (pure, easily tested); update `tests/integration/api/opportunities-route.test.ts` to assert the new `OpportunityFeedApiResponse` shape (`feed` + `channels`) in the route's JSON response; **add an explicit backward-compatibility regression test** — construct a `SavedResearchSession` shaped exactly like data saved *before* this stage (i.e. `result` with no `channels` anywhere, since it never had one) and assert `isValidOpportunityFeedResult()`/`isValidSavedResearchSession()` (`lib/workspace/guards.ts`) still accept it unchanged, proving the persisted shape genuinely didn't move.
- **Manual QA checklist:** channel grid shows correct thumbnail/subscriber/view/video-count/outlier-rate per channel for a multi-channel result; a channel contributing only 1 video still renders correctly; a channel that failed analysis (present in `failures`, not in `channels`/`items`) is handled sensibly (excluded from the grid, not shown with blank data); sort order is deterministic and documented; **a Workspace session saved before this stage shipped (or a session saved via the Stage-0/pre-Stage-3 build) still lists, opens, and renders correctly in `/workspace` after this stage ships** — this is the concrete check that the backward-compatibility design actually holds, not just a unit-test assertion; `SaveResearchButton` on `/opportunities` still saves a new session correctly and it appears in `/workspace` with the same fields as before (no `channels` data leaks into what gets saved).
- **Dependencies:** Stage 1 merged (reuses `Grid` primitive).
- **Explicit non-goals:** no "Similar Channels" entry point, no channel detail view yet, no change to `lib/workspace/*`, no change to the shape of what `SaveResearchButton` persists, no migration of existing saved sessions (none is needed under this design).

### Stage 4 — Channel/video detail interaction (F.3)

- **Scope:** to be scoped in its own follow-up plan once Stages 1–3 are merged and a concrete decision is made on "detail = larger layout of already-fetched data" vs. "detail = new fetch." This audit deliberately does not pre-scope this stage's files, since doing so would risk inventing an API surface (explicitly disallowed).
- **Explicit non-goals for this audit's plan:** no code, no component names, no API shape proposed here — flagged as the stage requiring the most upfront product/data decision-making before implementation begins.

**Similar Channels (F.5) is intentionally not a stage in this plan** — see Product Principle 7.

---

## G. Risk Register

| Risk | Area | Likelihood evidence | Impact | Mitigation |
|---|---|---|---|---|
| Grid images cause layout shift / slow initial paint | Performance | Confirmed: no `next/image`, no `loading="lazy"`, no explicit dimensions anywhere today (§7) | Medium | **Stage 1 must choose one of two paths** (§C, §9 Stage 1): adopt `next/image` for new grid cards and add `images.remotePatterns` to `next.config.ts`, **or** keep raw `<img>` and add explicit `width`/`height` + `loading="lazy"` to the new elements. Either is acceptable; leaving neither undone is not. |
| Duplicated helpers multiply as UI2 adds more fetch-driven components | Maintainability | Confirmed: 3 exact duplicates already exist (§C, §E) | Medium | Stage 0 extraction before any UI2 component work. |
| No automated coverage for new interactive surfaces (grid keyboard nav, focus) | Quality | Confirmed: 0 component/DOM/E2E tests exist; every real UI1 bug in this project's history was only caught manually (§6) | High | **Accepted for Stage 1** under the policy decided in §6: every UI2 stage's manual QA checklist is treated as a hard gate. Revisit adding `jsdom`/testing-library as a separately-approved decision no later than before Stage 4. |
| "Similar Channels" gets scope-crept into an earlier stage under schedule pressure | Product/Cost | Explicit ask in the source task list for this audit; zero backing data exists (§D.1, §F.5) | High if it happens | This plan (§F) excludes it entirely; any future request to add it should be re-routed through a dedicated data/cost design task, not folded into a grid PR. |
| Channel avatar quality complaints in a denser grid layout | Data/UX | Confirmed: channel thumbnails use `default` size only, unlike videos (§D.1) | Low–Medium | One-line fix in Stage 0. |
| Opportunities channel grid (F.1/Stage 3) built against channel data that isn't actually in the `/api/opportunities` response | Data/API | Confirmed by tracing `compareChannels → buildOpportunityFeed → OpportunityFeedResult → route JSON` call-by-call (§D.4): thumbnail, subscriber/view/video counts, and outlier rate are computed server-side but never serialized to the client on this endpoint | Medium–High if unaddressed (would block Stage 3 mid-implementation) | Stage 3 (§9) now explicitly includes the required API response-shape change as its first sub-scope, not assumed to already exist. |
| Adding the missing channel data (row above) directly onto `OpportunityFeedResult` would silently break every pre-existing saved Workspace session | Data/Backward-compatibility | Confirmed: `OpportunityFeedResult` is the exact type persisted verbatim to `localStorage` and validated by `isValidOpportunityFeedResult()` (`lib/workspace/guards.ts`, §D.4) — a required new field on it would fail that validation for any session saved before the change, and `parseStoredSessions()` silently drops sessions that fail validation | High if it had shipped this way (silent, user-visible data loss with no error) | **Caught in this revision before implementation** — Stage 3 (§9) now uses a separate `OpportunityFeedApiResponse` wrapper type for the live endpoint only; `OpportunityFeedResult` and all of `lib/workspace/*` are explicitly unmodified. Stage 3 also adds a regression test asserting pre-existing saved-session data still validates unchanged. |
| Workspace `VideoCard` reuse (F.4/Stage 2) assumed to be a drop-in reuse of the Analyzer card | Data/Type-safety | Confirmed: Analyzer uses `VideoAnalysis`, Workspace/Opportunities use `OpportunityFeedItem` — different shapes (§F.4) | Medium | F.4/Stage 2 now name three explicit sharing strategies (thin wrapper, adapter, shared optional-fields view-model) and flag the "sessions grid vs. inner video grid" product decision as unresolved, rather than assuming one file changes. |
| Detail interaction stage scope balloons into fetching un-designed fields | Scope | `lib/youtube/schemas.ts` does not parse tags/category; no schema exists for them today | Medium | Stage 4 explicitly deferred and unscoped in this plan (§F.3, §9 Stage 4) pending an explicit decision. |
| Stale `CLAUDE.md` "Current stage" section misleads future contributors | Process | Confirmed stale today (§B, footnote) | Low | Update `CLAUDE.md` as part of Stage 0's PR (small, out of audit scope to do here since this audit must not modify application code — but `CLAUDE.md` is documentation, not application code, so this can be flagged for the Stage 0 PR to include). |

---

## H. Recommended First PR

**Stage 0 as scoped in §9** — cleanup and UI foundations, with a small number of deliberate, low-risk, intentional UX changes (landing CTA, route-level loading/error boundaries, channel thumbnail quality) and no grid/card implementation. Concretely:

1. Extract `isApiErrorBody` (byte-identical in all 3 client components today — a clean extraction) to a shared module; update all 3 call sites to import instead of redefine. Extract `formatDuration` and `buildYoutubeWatchUrl` similarly (each byte-identical in their 2 respective call sites). **Do not** build a shared `useApiSubmit` hook in this PR — direct comparison of the three client components' request flows (§E.2) found real divergence (different request body shapes, different validation, `OpportunityFeedClient`'s extra post-success logic) that would make a generic hook awkward; revisit this only once a later UI2 component's request flow clarifies a genuinely common shape.
2. Add `app/loading.tsx` (Server Component, lightweight fallback — closes the route-transition/streaming gap, not the existing client-fetch loading states, which are unaffected and already correct) and `app/error.tsx` (**must be a Client Component**, `"use client"`, receiving `error`/`reset` (or `unstable_retry`) props and rendering an explicit "Try again" recovery action per Next.js's error-boundary contract).
3. Wire the landing page "Get Started" button to navigate to `/analyzer`.
4. Fix `resolveChannel.ts` to use `pickBestThumbnailUrl()` for channel thumbnails instead of hardcoding `default`.
5. Create `docs/manual-qa-checklist.md` (§6, §9 Stage 0) — the checked-in checklist every later UI2 stage's manual QA extends. This PR's own manual QA (step 7) is the first thing it should cover.
6. Update `CLAUDE.md`'s "Current stage" section to reflect that UI1 (including the mobile-nav hotfix) is merged. (`CLAUDE.md` is documentation, not application code — in scope for this PR even though this audit itself must not and did not modify it.)
7. Run `npm test && npm run lint && npm run typecheck && npm run build` and confirm all four still pass; manually re-verify the 4 existing feature pages render unchanged, the landing button now navigates, a thrown render error shows the new recovery UI, and channel thumbnails are visibly sharper where a better size is now available.

This PR touches no new dependency, no new route, no grid/card code, and is fully reversible — a small set of clearly-labeled, low-risk UX fixes plus cleanup that directly un-blocks every later UI2 stage identified in §F/§9. It does **not** attempt the Opportunities channel-grid API response-shape change (§D.4/Stage 3) or any Workspace-card sharing-strategy decision (§F.4/Stage 2) — those remain correctly scoped to their own later stages.

---

## Appendix: Files Read During This Audit

`app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/analyzer/page.tsx`, `app/compare/page.tsx`, `app/opportunities/page.tsx`, `app/workspace/page.tsx`, `app/api/analyzer/route.ts`, `app/api/compare/route.ts`, `app/api/opportunities/route.ts`, `components/app-shell/app-shell.tsx`, `components/app-shell/navigation.ts`, `components/channel-analyzer/{ChannelAnalyzerClient,ChannelSummary,OutlierBadge,VideoResultsTable}.tsx`, `components/channel-compare/{ChannelCompareClient,ComparisonTable}.tsx`, `components/opportunity-feed/{OpportunityFeedClient,OpportunityFeedTable}.tsx`, `components/title-patterns/TitlePatternPanel.tsx`, `components/workspace/{WorkspaceClient,SaveResearchButton}.tsx`, `lib/channel-analyzer/{types,analyze-channel,compare-channels,build-opportunity-feed,outlier-rate}.ts`, `lib/youtube/{types,resolve-channel,client,request,quota,schemas,video-id-parser,playlist-items,videos,thumbnail,errors,parse-channel-input,parse-safe-count,duration}.ts`, `lib/workspace/{types,storage,guards}.ts`, `lib/transcript/{types,domain}.ts`, `lib/analysis/{median,outlier}.ts`, `lib/title-patterns/{types,analyze-title-patterns}.ts`, `lib/opportunities/parse-channel-query.ts`, `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `CLAUDE.md`, plus a full directory listing of `tests/` (26 files, names reviewed, not all bodies read line-by-line where the corresponding `lib` module was already fully read). This revision additionally re-read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{error,loading}.md` to verify the `error.tsx`/`loading.tsx` contract precisely (Client Component requirement, `error`/`reset` props, Suspense/streaming scope) before correcting §C and §H.

Constraints honored throughout: no application code modified, no dependency installed or updated, no package manifest or lockfile changed, no UI2 component created, no API or data field invented beyond what was directly observed in source, no commit or push performed.
